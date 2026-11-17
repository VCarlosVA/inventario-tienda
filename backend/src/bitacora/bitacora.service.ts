import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraAcceso, EventoAcceso } from './bitacora-acceso.entity';
import { ListarBitacoraDto } from './dto/listar-bitacora.dto';
import { describirNavegador } from './navegador';

@Injectable()
export class BitacoraService {
  private readonly logger = new Logger(BitacoraService.name);

  constructor(
    @InjectRepository(BitacoraAcceso)
    private readonly repo: Repository<BitacoraAcceso>,
  ) {}

  // Un fallo al registrar no debe impedir iniciar o cerrar sesión: se deja en el log del servidor
  async registrar(datos: {
    usuarioId: number;
    correo: string;
    evento: EventoAcceso;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      await this.repo.save(
        this.repo.create({
          usuarioId: datos.usuarioId,
          correo: datos.correo,
          evento: datos.evento,
          ip: (datos.ip ?? 'desconocida').slice(0, 64),
          navegador: describirNavegador(datos.userAgent).slice(0, 120),
          userAgent: datos.userAgent ? datos.userAgent.slice(0, 400) : null,
        }),
      );
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el evento en la bitácora: ${(error as Error).message}`,
      );
    }
  }

  async listar(filtros: ListarBitacoraDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;

    const qb = this.repo
      .createQueryBuilder('b')
      .orderBy('b.creadoEn', 'DESC')
      .addOrderBy('b.id', 'DESC')
      .skip((pagina - 1) * limite)
      .take(limite);

    if (filtros.usuarioId) {
      qb.andWhere('b.usuarioId = :usuarioId', { usuarioId: filtros.usuarioId });
    }
    if (filtros.evento) {
      qb.andWhere('b.evento = :evento', { evento: filtros.evento });
    }
    if (filtros.desde) {
      qb.andWhere('b.creadoEn >= :desde', { desde: new Date(filtros.desde) });
    }
    if (filtros.hasta) {
      qb.andWhere('b.creadoEn <= :hasta', { hasta: new Date(filtros.hasta) });
    }

    const [datos, total] = await qb.getManyAndCount();
    return { datos, total, pagina, limite, paginas: Math.ceil(total / limite) };
  }
}