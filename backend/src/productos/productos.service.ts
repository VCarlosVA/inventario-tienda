import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Categoria } from '../categorias/categoria.entity';
import { Proveedor } from '../proveedores/proveedor.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { ListarProductosDto } from './dto/listar-productos.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './producto.entity';

const esDuplicado = (error: unknown) =>
  (error as { code?: string }).code === '23505';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categorias: Repository<Categoria>,
    @InjectRepository(Proveedor)
    private readonly proveedores: Repository<Proveedor>,
  ) {}

  async findAll(filtros: ListarProductosDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;

    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'c')
      .leftJoinAndSelect('p.proveedor', 'pr')
      .orderBy('p.nombre', 'ASC')
      .addOrderBy('p.id', 'ASC')
      .skip((pagina - 1) * limite)
      .take(limite);

    if (filtros.buscar) {
      // Se escapan % y _ para que se busquen como texto normal
      const texto = filtros.buscar.replace(/[\\%_]/g, '\\$&');
      qb.andWhere('(p.nombre ILIKE :q OR p.codigo ILIKE :q)', {
        q: `%${texto}%`,
      });
    }
    if (filtros.categoriaId) {
      qb.andWhere('p.categoriaId = :categoriaId', {
        categoriaId: filtros.categoriaId,
      });
    }
    if (filtros.proveedorId) {
      qb.andWhere('p.proveedorId = :proveedorId', {
        proveedorId: filtros.proveedorId,
      });
    }
    if (filtros.stockBajo === true) {
      qb.andWhere('p.stock <= p.stockMinimo');
    }

    const [datos, total] = await qb.getManyAndCount();
    return { datos, total, pagina, limite, paginas: Math.ceil(total / limite) };
  }

  findEliminados() {
    return this.repo.find({
      withDeleted: true,
      where: { eliminadoEn: Not(IsNull()) },
      relations: { categoria: true, proveedor: true },
      order: { eliminadoEn: 'DESC' },
    });
  }

  async findOne(id: number) {
    const producto = await this.repo.findOne({
      where: { id },
      relations: { categoria: true, proveedor: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async create(dto: CreateProductoDto) {
    await this.validarRelaciones(dto.categoriaId, dto.proveedorId);
    await this.validarCodigoLibre(dto.codigo);
    try {
      // El stock no viene en el DTO: nace en 0 por defecto
      const producto = await this.repo.save(this.repo.create(dto));
      return await this.findOne(producto.id);
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException('Ya existe un producto con ese código');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateProductoDto) {
    const producto = await this.findOne(id);

    const cambios = Object.fromEntries(
      Object.entries(dto).filter(([, valor]) => valor !== undefined),
    ) as UpdateProductoDto;
    if (Object.keys(cambios).length === 0) {
      throw new BadRequestException('Indica al menos un dato para actualizar');
    }

    await this.validarRelaciones(
      cambios.categoriaId !== producto.categoriaId ? cambios.categoriaId : undefined,
      cambios.proveedorId !== producto.proveedorId ? cambios.proveedorId : undefined,
    );
    if (cambios.codigo && cambios.codigo !== producto.codigo) {
      await this.validarCodigoLibre(cambios.codigo);
    }

    try {
      await this.repo.update(id, cambios);
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException('Ya existe un producto con ese código');
      }
      throw error;
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.softDelete(id);
    return { mensaje: 'Producto eliminado' };
  }

  async restore(id: number) {
    const eliminado = await this.repo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!eliminado || !eliminado.eliminadoEn) {
      throw new NotFoundException('No hay un producto eliminado con ese id');
    }
    if (!(await this.categorias.findOneBy({ id: eliminado.categoriaId }))) {
      throw new ConflictException(
        'No se puede restaurar: su categoría fue eliminada. Restaura la categoría primero.',
      );
    }
    if (!(await this.proveedores.findOneBy({ id: eliminado.proveedorId }))) {
      throw new ConflictException(
        'No se puede restaurar: su proveedor fue eliminado. Restaura el proveedor primero.',
      );
    }
    await this.validarCodigoLibre(eliminado.codigo);
    await this.repo.restore(id);
    return this.findOne(id);
  }

  // La categoría y el proveedor deben existir y estar activos
  private async validarRelaciones(categoriaId?: number, proveedorId?: number) {
    if (
      categoriaId !== undefined &&
      !(await this.categorias.findOneBy({ id: categoriaId }))
    ) {
      throw new BadRequestException(
        'La categoría indicada no existe o fue eliminada',
      );
    }
    if (
      proveedorId !== undefined &&
      !(await this.proveedores.findOneBy({ id: proveedorId }))
    ) {
      throw new BadRequestException(
        'El proveedor indicado no existe o fue eliminado',
      );
    }
  }

  // Solo compara contra productos activos
  private async validarCodigoLibre(codigo: string) {
    if (await this.repo.findOneBy({ codigo })) {
      throw new ConflictException('Ya existe un producto con ese código');
    }
  }
}