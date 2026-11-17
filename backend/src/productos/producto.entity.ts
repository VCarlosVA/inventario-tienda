import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from '../categorias/categoria.entity';
import { Proveedor } from '../proveedores/proveedor.entity';
import { numericTransformer } from './numeric.transformer';
import { UnidadMedida } from './unidad-medida.enum';

@Entity('productos')
// El código es único solo entre productos activos
@Index(['codigo'], { unique: true, where: '"eliminadoEn" IS NULL' })
// La base de datos misma impide stock o precios negativos
@Check('"stock" >= 0')
@Check('"precioCompra" >= 0 AND "precioVenta" >= 0')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  codigo: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Index()
  @Column()
  categoriaId: number;

  @ManyToOne(() => Categoria, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @Index()
  @Column()
  proveedorId: number;

  @ManyToOne(() => Proveedor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proveedorId' })
  proveedor: Proveedor;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  precioCompra: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  precioVenta: number;

  // Solo cambia con movimientos de inventario (Fase 5). Ningún endpoint lo edita a mano.
  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  stockMinimo: number;

  @Column({ type: 'enum', enum: UnidadMedida, default: UnidadMedida.UNIDAD })
  unidad: UnidadMedida;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  eliminadoEn?: Date;
}