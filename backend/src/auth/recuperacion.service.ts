import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from './mail.service';
import { evaluarFortaleza } from './password-strength';

const COSTO_BCRYPT = 10;
const sha256 = (texto: string) =>
  createHash('sha256').update(texto).digest('hex');

export const MENSAJE_GENERICO =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

@Injectable()
export class RecuperacionService {
  private readonly logger = new Logger(RecuperacionService.name);
  private readonly minutos: number;
  private readonly esperaSegundos: number;
  private readonly frontendUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly usuarios: UsuariosService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.minutos = Number(config.get('RECUPERACION_MINUTOS') ?? 15);
    this.esperaSegundos = Number(
      config.get('RECUPERACION_ESPERA_SEGUNDOS') ?? 60,
    );
    this.frontendUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  async solicitar(correo: string) {
    const usuario = await this.usuarios.findByCorreo(correo);

    if (usuario) {
      // Límite de espera: evita llenar de correos la bandeja de otra persona
      const reciente: unknown[] = await this.dataSource.query(
        `SELECT 1 FROM tokens_recuperacion
          WHERE "usuarioId" = $1
            AND "creadoEn" > NOW() - make_interval(secs => $2)
          LIMIT 1`,
        [usuario.id, this.esperaSegundos],
      );

      if (reciente.length === 0) {
        const token = randomBytes(32).toString('hex');

        await this.dataSource.transaction(async (m) => {
          await m.query(
            `UPDATE tokens_recuperacion SET "usadoEn" = NOW()
              WHERE "usuarioId" = $1 AND "usadoEn" IS NULL`,
            [usuario.id],
          );
          await m.query(
            `INSERT INTO tokens_recuperacion ("usuarioId", "tokenHash", "expiraEn")
             VALUES ($1, $2, NOW() + make_interval(mins => $3))`,
            [usuario.id, sha256(token), this.minutos],
          );
        });

        const enlace = `${this.frontendUrl}/restablecer?token=${token}`;
        // Sin await: el tiempo de respuesta no revela si la cuenta existe
        void this.mail
          .enviarRecuperacion(usuario.correo, usuario.nombre, enlace, this.minutos)
          .catch((err: Error) =>
            this.logger.error(
              `No se pudo enviar el correo de recuperación: ${err.message}`,
            ),
          );
      }
    }

    return { mensaje: MENSAJE_GENERICO };
  }

  async restablecer(token: string, nuevaPassword: string) {
    const { nivel } = evaluarFortaleza(nuevaPassword);
    const passwordCifrada = await hash(nuevaPassword, COSTO_BCRYPT);
    const tokenHash = sha256(token);

    await this.dataSource.transaction(async (m) => {
      const tokens: { usuarioId: number }[] = await m.query(
        `SELECT "usuarioId" FROM tokens_recuperacion
          WHERE "tokenHash" = $1 AND "usadoEn" IS NULL AND "expiraEn" > NOW()
          FOR UPDATE`,
        [tokenHash],
      );
      if (tokens.length === 0) throw this.enlaceInvalido();
      const { usuarioId } = tokens[0];

      const activos: unknown[] = await m.query(
        `SELECT id FROM usuarios WHERE id = $1 AND "eliminadoEn" IS NULL FOR UPDATE`,
        [usuarioId],
      );
      if (activos.length === 0) throw this.enlaceInvalido();

      // Cambia la contraseña y desbloquea la cuenta si estaba bloqueada
      await m.query(
        `UPDATE usuarios
            SET password = $1, "intentosFallidos" = 0, "bloqueadoHasta" = NULL
          WHERE id = $2`,
        [passwordCifrada, usuarioId],
      );
      await m.query(
        `UPDATE tokens_recuperacion SET "usadoEn" = NOW()
          WHERE "usuarioId" = $1 AND "usadoEn" IS NULL`,
        [usuarioId],
      );
    });

    return {
      mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      nivelPassword: nivel,
    };
  }

  private enlaceInvalido() {
    return new BadRequestException(
      'El enlace no es válido o ya venció. Solicita uno nuevo.',
    );
  }
}