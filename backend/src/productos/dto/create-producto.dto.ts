import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { UnidadMedida } from '../unidad-medida.enum';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductoDto {
  @ApiProperty({ example: 'COLA-500', description: 'Se guarda en mayúsculas' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'El código debe ser texto' })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @MaxLength(40, { message: 'El código no puede superar 40 caracteres' })
  @Matches(/^[A-Z0-9][A-Z0-9._-]*$/, {
    message: 'El código solo admite letras, números, punto, guion y guion bajo',
  })
  codigo: string;

  @ApiProperty({ example: 'Gaseosa Cola 500 ml', minLength: 2, maxLength: 120 })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Botella retornable' })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres' })
  descripcion?: string;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'La categoría debe ser un número entero' })
  @Min(1, { message: 'La categoría no es válida' })
  categoriaId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El proveedor debe ser un número entero' })
  @Min(1, { message: 'El proveedor no es válido' })
  proveedorId: number;

  @ApiProperty({ example: 3.5, description: 'Hasta 2 decimales' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio de compra debe ser un número con hasta 2 decimales' })
  @Min(0, { message: 'El precio de compra no puede ser negativo' })
  @Max(99999999.99, { message: 'El precio de compra es demasiado alto' })
  precioCompra: number;

  @ApiProperty({ example: 5, description: 'Hasta 2 decimales' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio de venta debe ser un número con hasta 2 decimales' })
  @Min(0, { message: 'El precio de venta no puede ser negativo' })
  @Max(99999999.99, { message: 'El precio de venta es demasiado alto' })
  precioVenta: number;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  @Max(1000000, { message: 'El stock mínimo es demasiado alto' })
  stockMinimo?: number;

  @ApiPropertyOptional({ enum: UnidadMedida, default: UnidadMedida.UNIDAD })
  @IsOptional()
  @IsEnum(UnidadMedida, { message: 'La unidad debe ser: unidad, kg, litro, paquete o caja' })
  unidad?: UnidadMedida;
}