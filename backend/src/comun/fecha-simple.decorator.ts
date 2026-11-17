import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

// Fecha de calendario real en formato AAAA-MM-DD (rechaza 2026-02-31, 2026-13-45, 17/11/2026...)
export const FechaSimple = (nombre: string) =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: `${nombre} debe tener el formato AAAA-MM-DD`,
    }),
    IsISO8601({ strict: true }, { message: `${nombre} no es una fecha válida` }),
  );