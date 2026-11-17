import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/jwt-auth.guard';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { ListarMovimientosDto } from './dto/listar-movimientos.dto';
import { Movimiento } from './movimiento.entity';
import {
  MOTIVOS_CON_OBSERVACION,
  MOTIVOS_POR_TIPO,
  TipoMovimiento,
} from './tipo-movimiento.enum';

const STOCK_MAXIMO = 1000000000;

interface FilaProducto {
  id: number;
  codigo: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  precioCompra: string;
  precioVenta: string;
}

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(Movimiento)
    private readonly repo: Repository<Movimiento>,
    private readonly dataSource: DataSource,
  ) {}

  async registrar(dto: CreateMovimientoDto, usuario: UsuarioAutenticado) {
    if (!MOTIVOS_POR_TIPO[dto.tipo].includes(dto.motivo)) {
      throw new BadRequestException(
        `El motivo "${dto.motivo}" no es válido para una ${dto.tipo}. Motivos permitidos: ${MOTIVOS_POR_TIPO[dto.tipo].join(', ')}.`,
      );
    }
    if (MOTIVOS_CON_OBSERVACION.includes(dto.motivo) && !dto.observacion) {
      throw new BadRequestException(
        'La observación es obligatoria para ajustes y mermas.',
      );
    }

    // Todo ocurre en una sola transacción: o se guardan el movimiento y el nuevo stock, o nada
    return this.dataSource.transaction(async (m) => {
      // FOR UPDATE bloquea la fila: dos movimientos simultáneos del mismo producto se procesan uno tras otro
      const filas: FilaProducto[] = await m.query(
        `SELECT id, codigo, nombre, stock, "stockMinimo", "precioCompra", "precioVenta"
           FROM productos
          WHERE id = $1 AND "eliminadoEn" IS NULL
          FOR UPDATE`,
        [dto.productoId],
      );
      if (filas.length === 0) {
        throw new NotFoundException('Producto no encontrado o eliminado');
      }
      const p = filas[0];

      const stockAnterior = Number(p.stock);
      const stockResultante =
        dto.tipo === TipoMovimiento.ENTRADA
          ? stockAnterior + dto.cantidad
          : stockAnterior - dto.cantidad;

      if (stockResultante < 0) {
        throw new ConflictException(
          `Stock insuficiente: hay ${stockAnterior} unidad(es) de ${p.nombre} y se intentó sacar ${dto.cantidad}.`,
        );
      }
      if (stockResultante > STOCK_MAXIMO) {
        throw new ConflictException('El stock resultante supera el máximo permitido.');
      }

      const precioUnitario =
        dto.precioUnitario ??
        Number(dto.tipo === TipoMovimiento.ENTRADA ? p.precioCompra : p.precioVenta);

      await m.query(
        `UPDATE productos SET stock = $1, "actualizadoEn" = NOW() WHERE id = $2`,
        [stockResultante, p.id],
      );

      const guardado = await m.save(
        Movimiento,
        m.create(Movimiento, {
          productoId: p.id,
          usuarioId: usuario.id,
          tipo: dto.tipo,
          motivo: dto.motivo,
          cantidad: dto.cantidad,
          stockAnterior,
          stockResultante,
          precioUnitario,
          observacion: dto.observacion || null,
        }),
      );

      return {
        mensaje: 'Movimiento registrado correctamente',
        // Avisa cuando una salida deja el producto en el stock mínimo o por debajo
        alertaStockBajo:
          dto.tipo === TipoMovimiento.SALIDA &&
          stockResultante <= Number(p.stockMinimo),
        movimiento: {
          id: guardado.id,
          tipo: guardado.tipo,
          motivo: guardado.motivo,
          cantidad: guardado.cantidad,
          stockAnterior,
          stockResultante,
          precioUnitario,
          observacion: guardado.observacion,
          creadoEn: guardado.creadoEn,
          producto: { id: p.id, codigo: p.codigo, nombre: p.nombre },
          usuario: { id: usuario.id, correo: usuario.correo },
        },
      };
    });
  }

  async listar(filtros: ListarMovimientosDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;

    const qb = this.consultaBase()
      .orderBy('m.creadoEn', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .skip((pagina - 1) * limite)
      .take(limite);

    if (filtros.productoId) {
      qb.andWhere('m.productoId = :productoId', { productoId: filtros.productoId });
    }
    if (filtros.usuarioId) {
      qb.andWhere('m.usuarioId = :usuarioId', { usuarioId: filtros.usuarioId });
    }
    if (filtros.tipo) qb.andWhere('m.tipo = :tipo', { tipo: filtros.tipo });
    if (filtros.motivo) qb.andWhere('m.motivo = :motivo', { motivo: filtros.motivo });
    if (filtros.desde) {
      qb.andWhere('m.creadoEn >= :desde', { desde: new Date(filtros.desde) });
    }
    if (filtros.hasta) {
      qb.andWhere('m.creadoEn <= :hasta', { hasta: new Date(filtros.hasta) });
    }

    const [datos, total] = await qb.getManyAndCount();
    return { datos, total, pagina, limite, paginas: Math.ceil(total / limite) };
  }

  async listarDeProducto(productoId: number, filtros: ListarMovimientosDto) {
    // Se acepta también un producto eliminado: su historial no desaparece
    const existe: unknown[] = await this.repo.query(
      `SELECT 1 FROM productos WHERE id = $1`,
      [productoId],
    );
    if (existe.length === 0) throw new NotFoundException('Producto no encontrado');
    return this.listar({ ...filtros, productoId });
  }

  async findOne(id: number) {
    const movimiento = await this.consultaBase()
      .andWhere('m.id = :id', { id })
      .getOne();
    if (!movimiento) throw new NotFoundException('Movimiento no encontrado');
    return movimiento;
  }

  // Incluye producto y usuario (aunque hayan sido eliminados lógicamente) y solo los datos necesarios
  private consultaBase() {
    return this.repo
      .createQueryBuilder('m')
      .withDeleted()
      .leftJoin('m.producto', 'p')
      .leftJoin('m.usuario', 'u')
      .addSelect(['p.id', 'p.codigo', 'p.nombre', 'u.id', 'u.nombre', 'u.correo']);
  }
}