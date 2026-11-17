import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proveedores')
// El nombre es único solo entre proveedores activos (se puede reutilizar tras eliminar uno)
@Index(['nombre'], { unique: true, where: '"eliminadoEn" IS NULL' })
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contacto?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  correo?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  eliminadoEn?: Date;
}