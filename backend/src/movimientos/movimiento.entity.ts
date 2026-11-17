import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../productos/numeric.transformer';
import { Producto } from '../productos/producto.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { MotivoMovimiento, TipoMovimiento } from './tipo-movimiento.enum';

// Un movimiento es un registro histórico: no se edita ni se elimina.
// Si hubo un error, se corrige con otro movimiento (por ejemplo, un ajuste).
@Entity('movimientos')
@Index(['productoId', 'creadoEn'])
@Index(['creadoEn'])
@Check('"cantidad" > 0')
@Check('"stockAnterior" >= 0 AND "stockResultante" >= 0')
export class Movimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @ManyToOne(() => Producto, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Index()
  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ type: 'enum', enum: TipoMovimiento })
  tipo: TipoMovimiento;

  @Column({ type: 'enum', enum: MotivoMovimiento })
  motivo: MotivoMovimiento;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int' })
  stockAnterior: number;

  @Column({ type: 'int' })
  stockResultante: number;

  // Precio del momento: sirve para calcular ganancias en los reportes aunque el precio cambie después
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  precioUnitario: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}