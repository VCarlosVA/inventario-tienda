import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@tienda.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @ApiProperty({ example: 'hola1234' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Identificador recibido en GET /auth/captcha',
    example: '3f1c2b9e-5a77-4c1e-9d0a-0b7e1f6c2a11',
  })
  @IsString({ message: 'El identificador del CAPTCHA debe ser texto' })
  @IsNotEmpty({ message: 'El identificador del CAPTCHA es obligatorio' })
  @MaxLength(64, { message: 'El identificador del CAPTCHA no es válido' })
  captchaId: string;

  @ApiProperty({
    description: 'Texto que se ve en la imagen del CAPTCHA',
    example: 'a7Kd',
  })
  @IsString({ message: 'El texto del CAPTCHA debe ser texto' })
  @IsNotEmpty({ message: 'Escribe el texto del CAPTCHA' })
  @MaxLength(10, { message: 'El texto del CAPTCHA no es válido' })
  captchaTexto: string;
}