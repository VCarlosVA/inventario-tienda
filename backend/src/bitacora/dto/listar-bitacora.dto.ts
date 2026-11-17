import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { EventoAcceso } from '../bitacora-acceso.entity';

export class ListarBitacoraDto {
  @ApiPropertyOptional({ description: 'Filtrar por id de usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'usuarioId debe ser un número entero' })
  @Min(1)
  usuarioId?: number;

  @ApiPropertyOptional({ enum: EventoAcceso })
  @IsOptional()
  @IsEnum(EventoAcceso, { message: 'El evento debe ser ingreso o salida' })
  evento?: EventoAcceso;

  @ApiPropertyOptional({
    description: 'Desde (ISO 8601 con zona horaria)',
    example: '2026-11-17T00:00:00-04:00',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha "desde" no es válida (formato ISO 8601)' })
  desde?: string;

  @ApiPropertyOptional({
    description: 'Hasta (ISO 8601 con zona horaria)',
    example: '2026-11-17T23:59:59-04:00',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha "hasta" no es válida (formato ISO 8601)' })
  hasta?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}