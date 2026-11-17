import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProveedorDto {
  @ApiProperty({ example: 'Distribuidora Andina', minLength: 2, maxLength: 120 })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Raúl Quispe' })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El contacto debe ser texto' })
  @MaxLength(120, { message: 'El contacto no puede superar 120 caracteres' })
  contacto?: string;

  @ApiPropertyOptional({ example: '70123456' })
  @IsOptional()
  @Transform(recortar)
  @Matches(/^[0-9+()\-\s]{6,30}$/, {
    message: 'El teléfono solo admite números, espacios, +, - y paréntesis (6 a 30 caracteres)',
  })
  telefono?: string;

  @ApiPropertyOptional({ example: 'ventas@andina.com' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  correo?: string;

  @ApiPropertyOptional({ example: 'Av. Camacho 1234, La Paz' })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(255, { message: 'La dirección no puede superar 255 caracteres' })
  direccion?: string;
}