import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { FechaSimple } from '../../comun/fecha-simple.decorator';

export class RangoFechasDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'AAAA-MM-DD, hora de Bolivia. Por defecto, hace 30 días',
  })
  @IsOptional()
  @FechaSimple('La fecha "desde"')
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-11-17',
    description: 'AAAA-MM-DD, hora de Bolivia. Por defecto, hoy',
  })
  @IsOptional()
  @FechaSimple('La fecha "hasta"')
  hasta?: string;
}

export class MasVendidosDto extends RangoFechasDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(50, { message: 'El límite máximo es 50' })
  limite?: number;
}

export class StockDto {
  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(50, { message: 'El límite máximo es 50' })
  limite?: number;

  @ApiPropertyOptional({
    description: 'true: solo productos con stock igual o menor al mínimo',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'soloBajo debe ser true o false' })
  soloBajo?: boolean;
}