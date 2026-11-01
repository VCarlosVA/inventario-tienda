import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  findById(id: number) {
    return this.repo.findOneBy({ id });
  }

  findByCorreo(correo: string) {
    return this.repo.findOneBy({ correo: correo.trim().toLowerCase() });
  }

  findByCorreoConPassword(correo: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.correo = :correo', { correo: correo.trim().toLowerCase() })
      .getOne();
  }
}