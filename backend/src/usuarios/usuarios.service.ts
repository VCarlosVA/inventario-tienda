import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from './rol.enum';

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
    // El rol siempre es vendedor: nunca se toma de la petición
  crear(datos: { nombre: string; correo: string; password: string }) {
    return this.repo.save(this.repo.create({ ...datos, rol: Rol.VENDEDOR }));
  }
}