import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraAcceso } from './bitacora-acceso.entity';
import { BitacoraService } from './bitacora.service';

@Module({
  imports: [TypeOrmModule.forFeature([BitacoraAcceso])],
  providers: [BitacoraService],
  exports: [BitacoraService],
})
export class BitacoraModule {}