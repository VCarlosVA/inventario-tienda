import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

// La contraseña no se cambia desde aquí: el usuario usa la recuperación por correo
export class UpdateUsuarioDto extends PartialType(
  OmitType(CreateUsuarioDto, ['password'] as const),
) {}