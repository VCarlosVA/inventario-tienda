import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from './rol.enum';

@Entity('usuarios')
// El correo es único solo entre usuarios activos (permite reutilizarlo tras una eliminación lógica)
@Index(['correo'], { unique: true, where: '"eliminadoEn" IS NULL' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  nombre: string;

  @Column({ length: 150 })
  correo: string;

  // select: false => la contraseña nunca sale en consultas normales ni en respuestas de la API
  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.VENDEDOR })
  rol: Rol;

  @Column({ type: 'int', default: 0 })
  intentosFallidos: number;

  @Column({ type: 'timestamp', nullable: true })
  bloqueadoHasta?: Date | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @DeleteDateColumn()
  eliminadoEn?: Date;
}