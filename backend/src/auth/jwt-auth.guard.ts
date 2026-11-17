import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Rol } from '../usuarios/rol.enum';
import { UsuariosService } from '../usuarios/usuarios.service';

export interface UsuarioAutenticado {
  id: number;
  correo: string;
  rol: Rol;
}

export type RequestConUsuario = Request & { usuario?: UsuarioAutenticado };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly usuarios: UsuariosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestConUsuario>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    let payload: { sub: number; iat: number };
    try {
      payload = await this.jwt.verifyAsync<{ sub: number; iat: number }>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    // Se consulta la base: un usuario eliminado pierde el acceso aunque su token no haya vencido
    const usuario = await this.usuarios.findById(payload.sub);
    if (!usuario) {
      throw new UnauthorizedException('El usuario ya no existe');
    }

    // Cierre de sesión o cambio de contraseña: los tokens anteriores dejan de valer
    // (iat va en segundos; se compara en segundos para no rechazar un login hecho justo después)
    if (
      usuario.sesionesDesde &&
      payload.iat < Math.floor(usuario.sesionesDesde.getTime() / 1000)
    ) {
      throw new UnauthorizedException(
        'La sesión ya no es válida. Inicia sesión de nuevo.',
      );
    }

    // El rol sale de la base de datos, no del token: si cambia, se aplica de inmediato
    req.usuario = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
    return true;
  }
}