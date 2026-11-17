import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BitacoraModule } from '../bitacora/bitacora.module';
import { Usuario } from '../usuarios/usuario.entity';
import { BitacoraController } from './bitacora.controller';
import { GestionUsuariosController } from './gestion-usuarios.controller';
import { GestionUsuariosService } from './gestion-usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario]), AuthModule, BitacoraModule],
  controllers: [GestionUsuariosController, BitacoraController],
  providers: [GestionUsuariosService],
})
export class AdministracionModule {}