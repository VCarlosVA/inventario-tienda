import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly repo: Repository<Categoria>,
  ) {}

  findAll() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const categoria = await this.repo.findOneBy({ id });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }

  async create(dto: CreateCategoriaDto) {
    await this.validarNombreUnico(dto.nombre);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateCategoriaDto) {
    const categoria = await this.findOne(id);
    if (dto.nombre && dto.nombre !== categoria.nombre) {
      await this.validarNombreUnico(dto.nombre);
    }
    return this.repo.save({ ...categoria, ...dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.softDelete(id);
    return { mensaje: 'Categoría eliminada' };
  }

  async restore(id: number) {
    const eliminada = await this.repo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!eliminada || !eliminada.eliminadoEn) {
      throw new NotFoundException('No hay una categoría eliminada con ese id');
    }
    await this.validarNombreUnico(eliminada.nombre);
    await this.repo.restore(id);
    return this.findOne(id);
  }

  // Solo compara contra categorías activas, así un nombre eliminado se puede reutilizar
  private async validarNombreUnico(nombre: string) {
    const existe = await this.repo.findOneBy({ nombre });
    if (existe) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }
}