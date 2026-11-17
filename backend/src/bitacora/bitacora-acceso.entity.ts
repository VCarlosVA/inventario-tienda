import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EventoAcceso {
  INGRESO = 'ingreso',
  SALIDA = 'salida',
}

@Entity('bitacora_accesos')
@Index(['usuarioId', 'creadoEn'])
export class BitacoraAcceso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  // Copia del correo al momento del evento: la bitácora no cambia aunque se edite o elimine el usuario
  @Column({ length: 150 })
  correo: string;

  @Column({ type: 'enum', enum: EventoAcceso })
  evento: EventoAcceso;

  @Column({ length: 64 })
  ip: string;

  @Column({ length: 120 })
  navegador: string;

  @Column({ type: 'varchar', length: 400, nullable: true })
  userAgent?: string | null;

  // Fecha y hora del evento (con zona horaria)
  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}