import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Movimiento } from './movimiento.entity';
import { MovimientosProductoController } from './movimientos-producto.controller';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movimiento]), AuthModule],
  controllers: [MovimientosController, MovimientosProductoController],
  providers: [MovimientosService],
})
export class MovimientosModule {}