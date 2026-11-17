import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;

  // Eliminación lógica: null = activa, con fecha = eliminada
  @DeleteDateColumn({ type: 'timestamptz' })
  eliminadoEn?: Date;
}