import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Not, Repository } from 'typeorm';
import { evaluarFortaleza } from '../auth/password-strength';
import { Rol } from '../usuarios/rol.enum';
import { Usuario } from '../usuarios/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const COSTO_BCRYPT = 10;

@Injectable()
export class GestionUsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  findAll() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const usuario = await this.repo.findOneBy({ id });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async crear(dto: CreateUsuarioDto) {
    await this.validarCorreoLibre(dto.correo);
    const { nivel } = evaluarFortaleza(dto.password);
    const password = await hash(dto.password, COSTO_BCRYPT);

    try {
      const usuario = await this.repo.save(
        this.repo.create({
          nombre: dto.nombre,
          correo: dto.correo,
          password,
          rol: dto.rol,
        }),
      );
      return {
        mensaje: 'Usuario creado correctamente',
        nivelPassword: nivel,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
        },
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
  }

  async actualizar(id: number, dto: UpdateUsuarioDto) {
    const usuario = await this.findOne(id);

    const cambios: Partial<Pick<Usuario, 'nombre' | 'correo' | 'rol'>> = {};
    if (dto.nombre !== undefined) cambios.nombre = dto.nombre;
    if (dto.correo !== undefined) cambios.correo = dto.correo;
    if (dto.rol !== undefined) cambios.rol = dto.rol;
    if (Object.keys(cambios).length === 0) {
      throw new BadRequestException('Indica al menos un dato para actualizar');
    }

    if (dto.correo && dto.correo !== usuario.correo) {
      await this.validarCorreoLibre(dto.correo);
    }
    // Quitarle el rol de administrador al último administrador dejaría el sistema sin control
    if (dto.rol && dto.rol !== usuario.rol && usuario.rol === Rol.ADMIN) {
      await this.asegurarOtroAdmin(id);
    }

    try {
      await this.repo.update(id, cambios);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
    return this.findOne(id);
  }

  async eliminar(id: number, actorId: number) {
    if (id === actorId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }
    const usuario = await this.findOne(id);
    if (usuario.rol === Rol.ADMIN) await this.asegurarOtroAdmin(id);

    await this.repo.softDelete(id);
    // Sus tokens dejan de valer aunque se restaure la cuenta más adelante
    await this.repo.query(
      `UPDATE usuarios SET "sesionesDesde" = NOW() WHERE id = $1`,
      [id],
    );
    return { mensaje: 'Usuario eliminado' };
  }

  async restaurar(id: number) {
    const eliminado = await this.repo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!eliminado || !eliminado.eliminadoEn) {
      throw new NotFoundException('No hay un usuario eliminado con ese id');
    }
    await this.validarCorreoLibre(eliminado.correo);
    await this.repo.restore(id);
    return this.findOne(id);
  }

  async desbloquear(id: number) {
    await this.findOne(id);
    await this.repo.query(
      `UPDATE usuarios SET "intentosFallidos" = 0, "bloqueadoHasta" = NULL WHERE id = $1`,
      [id],
    );
    return { mensaje: 'Cuenta desbloqueada' };
  }

  // Solo compara contra usuarios activos, igual que el índice único de la base
  private async validarCorreoLibre(correo: string) {
    const existe = await this.repo.findOneBy({
      correo: correo.trim().toLowerCase(),
    });
    if (existe) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }
  }

  private async asegurarOtroAdmin(idExcluido: number) {
    const otros = await this.repo.count({
      where: { rol: Rol.ADMIN, id: Not(idExcluido) },
    });
    if (otros === 0) {
      throw new ConflictException(
        'No puedes dejar al sistema sin administradores',
      );
    }
  }
}