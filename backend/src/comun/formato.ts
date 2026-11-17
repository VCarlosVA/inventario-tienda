import { BadRequestException } from '@nestjs/common';

export const ZONA_POR_DEFECTO = 'America/La_Paz';
const MS_DIA = 86_400_000;

function aUtc(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria indicada */
export function hoyEn(zona: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function sumarDias(fecha: string, dias: number): string {
  return new Date(aUtc(fecha) + dias * MS_DIA).toISOString().slice(0, 10);
}

/**
 * Completa y valida un rango de fechas (AAAA-MM-DD, días completos en la zona horaria local).
 * Sin "hasta" se usa hoy; sin "desde" se usan los últimos `diasPorDefecto` días.
 */
export function resolverRango(
  zona: string,
  desde?: string,
  hasta?: string,
  maxDias = 366,
  diasPorDefecto = 30,
): { desde: string; hasta: string; dias: number } {
  const h = hasta ?? hoyEn(zona);
  const d = desde ?? sumarDias(h, -(diasPorDefecto - 1));
  if (aUtc(d) > aUtc(h)) {
    throw new BadRequestException(
      'La fecha "desde" no puede ser posterior a "hasta"',
    );
  }
  const dias = (aUtc(h) - aUtc(d)) / MS_DIA + 1;
  if (dias > maxDias) {
    throw new BadRequestException(`El rango no puede superar ${maxDias} días`);
  }
  return { desde: d, hasta: h, dias };
}

/** "2026-11-17" -> "17/11/2026" */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** Fecha y hora en la zona horaria local: "17/11/2026 06:30" */
export function formatearFechaHora(fecha: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('es-BO', {
    timeZone: zona,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const g = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
}

export const moneda = (n: number) =>
  Number(n).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const entero = (n: number) => Number(n).toLocaleString('es-BO');