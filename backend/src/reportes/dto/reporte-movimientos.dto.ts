import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { FechaSimple } from '../../comun/fecha-simple.decorator';
import {
  MotivoMovimiento,
  TipoMovimiento,
} from '../../movimientos/tipo-movimiento.enum';

export class ReporteMovimientosDto {
  @ApiProperty({
    example: '2026-11-01',
    description: 'AAAA-MM-DD, hora de Bolivia (obligatoria)',
  })
  @IsNotEmpty({ message: 'La fecha "desde" es obligatoria' })
  @FechaSimple('La fecha "desde"')
  desde: string;

  @ApiProperty({
    example: '2026-11-17',
    description: 'AAAA-MM-DD, hora de Bolivia (obligatoria). Máximo 366 días de rango',
  })
  @IsNotEmpty({ message: 'La fecha "hasta" es obligatoria' })
  @FechaSimple('La fecha "hasta"')
  hasta: string;

  @ApiPropertyOptional({ enum: TipoMovimiento })
  @IsOptional()
  @IsEnum(TipoMovimiento, { message: 'El tipo debe ser entrada o salida' })
  tipo?: TipoMovimiento;

  @ApiPropertyOptional({ enum: MotivoMovimiento })
  @IsOptional()
  @IsEnum(MotivoMovimiento, { message: 'El motivo no es válido' })
  motivo?: MotivoMovimiento;

  @ApiPropertyOptional({ description: 'Solo movimientos de este producto' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'productoId debe ser un número entero' })
  @Min(1, { message: 'productoId no es válido' })
  productoId?: number;

  @ApiPropertyOptional({ description: 'Solo movimientos hechos por este usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'usuarioId debe ser un número entero' })
  @Min(1, { message: 'usuarioId no es válido' })
  usuarioId?: number;
}