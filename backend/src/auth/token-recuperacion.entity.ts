import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('tokens_recuperacion')
export class TokenRecuperacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  // Se guarda el hash del token, nunca el token: si alguien lee la base, no puede usarlos
  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiraEn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usadoEn?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}