import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeedService } from './admin-seed.service';
import { Usuario } from './usuario.entity';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [UsuariosService, AdminSeedService],
  exports: [UsuariosService],
})
export class UsuariosModule {}