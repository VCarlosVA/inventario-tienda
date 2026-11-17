import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../usuarios/rol.enum';
import type { RequestConUsuario } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

// Debe usarse DESPUÉS de JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Sin @Roles(), basta con estar autenticado
    if (!requeridos || requeridos.length === 0) return true;

    const { usuario } = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!usuario || !requeridos.includes(usuario.rol)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }
    return true;
  }
}