import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MotivoMovimiento, TipoMovimiento } from '../tipo-movimiento.enum';

export class CreateMovimientoDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El producto debe ser un número entero' })
  @Min(1, { message: 'El producto no es válido' })
  productoId: number;

  @ApiProperty({ enum: TipoMovimiento, example: TipoMovimiento.ENTRADA })
  @IsEnum(TipoMovimiento, { message: 'El tipo debe ser entrada o salida' })
  tipo: TipoMovimiento;

  @ApiProperty({
    enum: MotivoMovimiento,
    example: MotivoMovimiento.COMPRA,
    description:
      'Entrada: compra, inventario_inicial, devolucion_cliente, ajuste. Salida: venta, merma, devolucion_proveedor, ajuste',
  })
  @IsEnum(MotivoMovimiento, {
    message:
      'El motivo debe ser: compra, inventario_inicial, devolucion_cliente, venta, merma, devolucion_proveedor o ajuste',
  })
  motivo: MotivoMovimiento;

  @ApiProperty({ example: 10, minimum: 1, maximum: 1000000 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(1000000, { message: 'La cantidad no puede superar 1.000.000' })
  cantidad: number;

  @ApiPropertyOptional({
    example: 3.5,
    description:
      'Si se omite, se usa el precio de compra del producto (entradas) o el de venta (salidas)',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio unitario debe ser un número con hasta 2 decimales' },
  )
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @Max(99999999.99, { message: 'El precio unitario es demasiado alto' })
  precioUnitario?: number;

  @ApiPropertyOptional({
    example: 'Conteo físico del 17/11: faltaban 2 unidades',
    description: 'Obligatoria para ajustes y mermas',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La observación debe ser texto' })
  @MaxLength(255, { message: 'La observación no puede superar 255 caracteres' })
  observacion?: string;
}