import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './rol.enum';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  findById(id: number) {
    return this.repo.findOneBy({ id });
  }

  findByCorreo(correo: string) {
    return this.repo.findOneBy({ correo: correo.trim().toLowerCase() });
  }

  // Incluye el hash de la contraseña. Solo para uso interno del login.
  findByCorreoConPassword(correo: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.correo = :correo', { correo: correo.trim().toLowerCase() })
      .getOne();
  }

  crear(datos: { nombre: string; correo: string; password: string }) {
    return this.repo.save(this.repo.create({ ...datos, rol: Rol.VENDEDOR }));
  }

  // ---------- Control de intentos de login ----------
  // Toda la lógica de tiempo se calcula en SQL con la hora de la base de datos
  // (NOW()), para no depender de la zona horaria del servidor Node

  // Si el bloqueo ya venció, reinicia el contador y quita el bloqueo
  async liberarSiVencido(id: number): Promise<void> {
    await this.repo.query(
      `UPDATE usuarios
          SET "intentosFallidos" = 0, "bloqueadoHasta" = NULL
        WHERE id = $1
          AND "bloqueadoHasta" IS NOT NULL
          AND "bloqueadoHasta"::timestamptz <= NOW()`,
      [id],
    );
  }

  async segundosDeBloqueo(id: number): Promise<number> {
    const filas: { segundos: string }[] = await this.repo.query(
      `SELECT CEIL(EXTRACT(EPOCH FROM ("bloqueadoHasta"::timestamptz - NOW()))) AS segundos
         FROM usuarios
        WHERE id = $1
          AND "bloqueadoHasta" IS NOT NULL
          AND "bloqueadoHasta"::timestamptz > NOW()`,
      [id],
    );
    return filas.length ? Number(filas[0].segundos) : 0;
  }

  async registrarFalloLogin(
    id: number,
    maxIntentos: number,
    minutosBloqueo: number,
  ): Promise<{ intentos: number; bloqueado: boolean }> {
    await this.repo.query(
      `UPDATE usuarios
          SET "intentosFallidos" = "intentosFallidos" + 1,
              "bloqueadoHasta" = CASE
                WHEN "intentosFallidos" + 1 >= $2 THEN NOW() + make_interval(mins => $3)
                ELSE "bloqueadoHasta"
              END
        WHERE id = $1`,
      [id, maxIntentos, minutosBloqueo],
    );
    const filas: { intentos: number; bloqueado: boolean }[] =
      await this.repo.query(
        `SELECT "intentosFallidos" AS intentos,
                ("bloqueadoHasta" IS NOT NULL AND "bloqueadoHasta"::timestamptz > NOW()) AS bloqueado
           FROM usuarios
          WHERE id = $1`,
        [id],
      );
    return {
      intentos: Number(filas[0]?.intentos ?? 0),
      bloqueado: Boolean(filas[0]?.bloqueado),
    };
  }

  async reiniciarIntentos(id: number): Promise<void> {
    await this.repo.query(
      `UPDATE usuarios
          SET "intentosFallidos" = 0, "bloqueadoHasta" = NULL
        WHERE id = $1
          AND ("intentosFallidos" > 0 OR "bloqueadoHasta" IS NOT NULL)`,
      [id],
    );
  }
}