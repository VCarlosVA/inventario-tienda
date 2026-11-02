import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestConUsuario } from './jwt-auth.guard';

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<RequestConUsuario>().usuario,
);