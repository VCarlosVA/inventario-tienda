import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ReporteInventarioDto {
  @ApiPropertyOptional({ description: 'Solo productos de esta categoría' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'categoriaId debe ser un número entero' })
  @Min(1, { message: 'categoriaId no es válido' })
  categoriaId?: number;

  @ApiPropertyOptional({ description: 'Solo productos de este proveedor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'proveedorId debe ser un número entero' })
  @Min(1, { message: 'proveedorId no es válido' })
  proveedorId?: number;

  @ApiPropertyOptional({
    description: 'true: solo productos con stock igual o menor al mínimo',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'soloStockBajo debe ser true o false' })
  soloStockBajo?: boolean;
}