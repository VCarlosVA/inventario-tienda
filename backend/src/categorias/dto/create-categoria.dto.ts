import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Bebidas', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Gaseosas, jugos y agua', maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, { message: 'La descripción no puede superar 255 caracteres' })
  descripcion?: string;
}