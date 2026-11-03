import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as svgCaptcha from 'svg-captcha';

const LONGITUD = 4;
const VIGENCIA_MS = 2 * 60 * 1000; // 2 minutos
const MAX_PENDIENTES = 5000; // tope para que no se llene la memoria

@Injectable()
export class CaptchaService implements OnModuleDestroy {
  // La respuesta correcta vive solo aquí, en el servidor. Nunca viaja al navegador.
  private readonly pendientes = new Map<
    string,
    { texto: string; expira: number }
  >();
  private readonly limpieza = setInterval(() => this.limpiar(), 60_000);

  constructor() {
    this.limpieza.unref();
  }

  onModuleDestroy() {
    clearInterval(this.limpieza);
  }

  generar() {
    this.limpiar();
    if (this.pendientes.size >= MAX_PENDIENTES) {
      const masAntiguo = this.pendientes.keys().next().value;
      if (masAntiguo) this.pendientes.delete(masAntiguo);
    }

    const { data, text } = svgCaptcha.create({
      size: LONGITUD,
      ignoreChars: '0oO1ilI',
      noise: 3,
      color: true,
      width: 160,
      height: 55,
      fontSize: 52,
    });

    const captchaId = randomUUID();
    this.pendientes.set(captchaId, {
      texto: text.toLowerCase(),
      expira: Date.now() + VIGENCIA_MS,
    });

    return {
      captchaId,
      imagen: `data:image/svg+xml;base64,${Buffer.from(data).toString('base64')}`,
      expiraEnSegundos: VIGENCIA_MS / 1000,
    };
  }

  validar(captchaId: string, texto: string): boolean {
    const entrada = this.pendientes.get(captchaId);
    this.pendientes.delete(captchaId);
    if (!entrada || entrada.expira < Date.now()) return false;
    return entrada.texto === texto.trim().toLowerCase();
  }

  private limpiar() {
    const ahora = Date.now();
    for (const [id, entrada] of this.pendientes) {
      if (entrada.expira < ahora) this.pendientes.delete(id);
    }
  }
}