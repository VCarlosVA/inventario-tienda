import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('MAIL_HOST');
    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASSWORD');
    const port = Number(config.get('MAIL_PORT') ?? 465);
    this.from = config.get<string>('MAIL_FROM') ?? user ?? 'no-reply@localhost';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn(
        'El correo no está configurado (MAIL_HOST, MAIL_USER, MAIL_PASSWORD). No se enviarán correos.',
      );
    }
  }

  async enviarRecuperacion(
    destino: string,
    nombre: string,
    enlace: string,
    minutos: number,
  ) {
    if (!this.transporter) {
      // Solo en desarrollo, para poder probar aunque falle el correo
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[solo desarrollo] Enlace de recuperación para ${destino}: ${enlace}`,
        );
      }
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: destino,
      subject: 'Recuperación de contraseña - Inventario Tienda',
      text:
        `Hola ${nombre},\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña.\n` +
        `Abre este enlace (vale ${minutos} minutos y solo se puede usar una vez):\n\n${enlace}\n\n` +
        `Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.`,
      html:
        `<p>Hola ${escaparHtml(nombre)},</p>` +
        `<p>Recibimos una solicitud para restablecer tu contraseña.</p>` +
        `<p><a href="${escaparHtml(enlace)}">Restablecer mi contraseña</a></p>` +
        `<p>El enlace vale <b>${minutos} minutos</b> y solo se puede usar una vez.</p>` +
        `<p>Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.</p>`,
    });
  }
}