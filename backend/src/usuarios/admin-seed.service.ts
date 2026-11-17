import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from './rol.enum';
import { Usuario } from './usuario.entity';

// Si no existe ningún administrador y hay ADMIN_CORREO y ADMIN_PASSWORD en el entorno,
// crea el primero (o promueve al usuario con ese correo). Si ya hay un administrador, no hace nada.
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const correo = this.config.get<string>('ADMIN_CORREO')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    const nombre =
      this.config.get<string>('ADMIN_NOMBRE')?.trim() || 'Administrador';
    if (!correo || !password) return;

    if ((await this.repo.count({ where: { rol: Rol.ADMIN } })) > 0) return;

    if (password.length < 8) {
      this.logger.warn(
        'ADMIN_PASSWORD debe tener al menos 8 caracteres. No se creó el administrador.',
      );
      return;
    }

    try {
      const existente = await this.repo.findOneBy({ correo });
      if (existente) {
        await this.repo.update(existente.id, { rol: Rol.ADMIN });
        this.logger.log(
          `El usuario ${correo} ya existía y ahora es administrador (conserva su contraseña).`,
        );
        return;
      }
      await this.repo.save(
        this.repo.create({
          nombre,
          correo,
          password: await hash(password, 10),
          rol: Rol.ADMIN,
        }),
      );
      this.logger.log(`Administrador inicial creado: ${correo}`);
    } catch (error) {
      // 23505: otra instancia lo creó al mismo tiempo
      if ((error as { code?: string }).code === '23505') return;
      throw error;
    }
  }
}