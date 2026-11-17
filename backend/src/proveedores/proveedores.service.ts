import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './proveedor.entity';

const esDuplicado = (error: unknown) =>
  (error as { code?: string }).code === '23505';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  findAll() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  findEliminados() {
    return this.repo.find({
      withDeleted: true,
      where: { eliminadoEn: Not(IsNull()) },
      order: { eliminadoEn: 'DESC' },
    });
  }

  async findOne(id: number) {
    const proveedor = await this.repo.findOneBy({ id });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(dto: CreateProveedorDto) {
    await this.validarNombreUnico(dto.nombre);
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException('Ya existe un proveedor con ese nombre');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateProveedorDto) {
    const proveedor = await this.findOne(id);
    if (dto.nombre && dto.nombre !== proveedor.nombre) {
      await this.validarNombreUnico(dto.nombre);
    }
    try {
      return await this.repo.save({ ...proveedor, ...dto });
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException('Ya existe un proveedor con ese nombre');
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    const filas: { n: number }[] = await this.repo.query(
      `SELECT COUNT(*)::int AS n FROM productos
        WHERE "proveedorId" = $1 AND "eliminadoEn" IS NULL`,
      [id],
    );
    const n = filas[0]?.n ?? 0;
    if (n > 0) {
      throw new ConflictException(
        `No se puede eliminar: el proveedor tiene ${n} producto(s) activo(s). Reasígnalos o elimínalos primero.`,
      );
    }
    await this.repo.softDelete(id);
    return { mensaje: 'Proveedor eliminado' };
  }

  async restore(id: number) {
    const eliminado = await this.repo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!eliminado || !eliminado.eliminadoEn) {
      throw new NotFoundException('No hay un proveedor eliminado con ese id');
    }
    await this.validarNombreUnico(eliminado.nombre);
    await this.repo.restore(id);
    return this.findOne(id);
  }

  // Solo compara contra proveedores activos
  private async validarNombreUnico(nombre: string) {
    if (await this.repo.findOneBy({ nombre })) {
      throw new ConflictException('Ya existe un proveedor con ese nombre');
    }
  }
}