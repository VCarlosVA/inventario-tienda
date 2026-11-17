import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RestablecerPasswordDto {
  @ApiProperty({ description: 'Token recibido en el enlace del correo' })
  @IsString({ message: 'El token debe ser texto' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @MaxLength(128, { message: 'El token no es válido' })
  token: string;

  @ApiProperty({ example: 'NuevaClave2026!', minLength: 6, maxLength: 72 })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  nuevaPassword: string;
}