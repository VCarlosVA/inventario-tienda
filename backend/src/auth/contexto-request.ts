import type { Request } from 'express';

export interface ContextoRequest {
  ip: string;
  userAgent?: string;
}

// Detrás de un proxy (Fase 8) habrá que activar "trust proxy" para ver la IP real del cliente
export function contextoDe(req: Request): ContextoRequest {
  const ip = (req.ip ?? req.socket?.remoteAddress ?? 'desconocida').replace(
    /^::ffff:/,
    '',
  );
  const ua = req.headers['user-agent'];
  return { ip, userAgent: typeof ua === 'string' ? ua : undefined };
}