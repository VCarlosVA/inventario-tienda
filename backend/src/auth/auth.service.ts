import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegisterDto } from './dto/register.dto';
import { evaluarFortaleza } from './password-strength';

const COSTO_BCRYPT = 10;

@Injectable()
export class AuthService {
  constructor(private readonly usuarios: UsuariosService) {}

  async register(dto: RegisterDto) {
    if (await this.usuarios.findByCorreo(dto.correo)) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const { nivel } = evaluarFortaleza(dto.password);
    const passwordCifrada = await hash(dto.password, COSTO_BCRYPT);

    try {
      const usuario = await this.usuarios.crear({
        nombre: dto.nombre,
        correo: dto.correo,
        password: passwordCifrada,
      });

      // Se arma la respuesta a mano para no devolver nunca la contraseña
      return {
        mensaje: 'Usuario registrado correctamente',
        nivelPassword: nivel,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
        },
      };
    } catch (error) {
      // 23505 = violación de índice único (dos registros simultáneos con el mismo correo)
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
  }
}