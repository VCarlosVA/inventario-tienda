import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/jwt-auth.guard';
import {
  entero,
  formatearFecha,
  formatearFechaHora,
  hoyEn,
  moneda,
  resolverRango,
  ZONA_POR_DEFECTO,
} from '../comun/formato';
import { ReporteInventarioDto } from './dto/reporte-inventario.dto';
import { ReporteMovimientosDto } from './dto/reporte-movimientos.dto';
import {
  Celda,
  Columna,
  dibujarTabla,
  encabezadoReporte,
  generarPdf,
  mensajeVacio,
  tarjetas,
} from './pdf.util';

const MAX_FILAS = 5000;
const redondear = (n: number) => Math.round(n * 100) / 100;
const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const etiqueta = (valor: string) => capitalizar(valor.replace(/_/g, ' '));

@Injectable()
export class ReportesService {
  private readonly zona: string;
  private readonly tienda: string;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.zona = config.get<string>('ZONA_HORARIA') ?? ZONA_POR_DEFECTO;
    this.tienda = config.get<string>('NOMBRE_TIENDA') ?? 'Tienda de Barrio';
  }

  async inventario(dto: ReporteInventarioDto, usuario: UsuarioAutenticado) {
    const donde: string[] = ['p."eliminadoEn" IS NULL'];
    const params: unknown[] = [];
    const filtros: string[] = [];

    if (dto.categoriaId) {
      const nombre = await this.nombreDe('categorias', dto.categoriaId, 'Categoría');
      params.push(dto.categoriaId);
      donde.push(`p."categoriaId" = $${params.length}`);
      filtros.push(`Categoría: ${nombre}`);
    }
    if (dto.proveedorId) {
      const nombre = await this.nombreDe('proveedores', dto.proveedorId, 'Proveedor');
      params.push(dto.proveedorId);
      donde.push(`p."proveedorId" = $${params.length}`);
      filtros.push(`Proveedor: ${nombre}`);
    }
    if (dto.soloStockBajo) {
      donde.push('p.stock <= p."stockMinimo"');
      filtros.push('Solo productos con stock bajo o sin stock');
    }

    const filas: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT p.codigo, p.nombre, c.nombre AS categoria, pr.nombre AS proveedor,
              p.stock, p."stockMinimo", p.unidad,
              p."precioCompra"::float8 AS "precioCompra",
              p."precioVenta"::float8 AS "precioVenta"
         FROM productos p
         JOIN categorias c ON c.id = p."categoriaId"
         JOIN proveedores pr ON pr.id = p."proveedorId"
        WHERE ${donde.join(' AND ')}
        ORDER BY c.nombre ASC, p.nombre ASC
        LIMIT ${MAX_FILAS + 1}`,
      params,
    );
    if (filas.length > MAX_FILAS) {
      throw new BadRequestException(
        `El reporte supera ${MAX_FILAS} productos. Usa filtros para acotarlo.`,
      );
    }

    let unidades = 0;
    let valorCompra = 0;
    let valorVenta = 0;
    let bajos = 0;
    const celdas: Celda[][] = filas.map((f) => {
      const stock = Number(f.stock);
      const minimo = Number(f.stockMinimo);
      const compra = Number(f.precioCompra);
      const venta = Number(f.precioVenta);
      const bajo = stock <= minimo;
      unidades += stock;
      valorCompra += stock * compra;
      valorVenta += stock * venta;
      if (bajo) bajos += 1;
      return [
        String(f.codigo),
        String(f.nombre),
        String(f.categoria),
        String(f.proveedor),
        { texto: String(stock), color: bajo ? '#B42318' : undefined, negrita: bajo },
        String(minimo),
        moneda(compra),
        moneda(venta),
        moneda(stock * compra),
      ];
    });

    const columnas: Columna[] = [
      { titulo: 'Código', ancho: 70 },
      { titulo: 'Producto', ancho: 190 },
      { titulo: 'Categoría', ancho: 100 },
      { titulo: 'Proveedor', ancho: 120 },
      { titulo: 'Stock', ancho: 50, alinear: 'right' },
      { titulo: 'Mínimo', ancho: 45, alinear: 'right' },
      { titulo: 'P. compra', ancho: 65, alinear: 'right' },
      { titulo: 'P. venta', ancho: 65, alinear: 'right' },
      { titulo: 'Valor (Bs)', ancho: 65, alinear: 'right' },
    ];

    const titulo = 'Reporte de inventario';
    const ahora = formatearFechaHora(new Date(), this.zona);
    const buffer = await generarPdf(
      `${this.tienda} - ${titulo}`,
      `${this.tienda} - ${titulo}`,
      (doc) => {
        let y = encabezadoReporte(doc, this.tienda, titulo, [
          `Filtros: ${filtros.length ? filtros.join(' | ') : 'ninguno'}`,
          `Generado el ${ahora} por ${usuario.correo}. Precios en bolivianos (Bs). Valor = stock por precio de compra.`,
        ]);
        y = tarjetas(doc, y, [
          { etiqueta: 'Productos', valor: entero(filas.length) },
          { etiqueta: 'Unidades en stock', valor: entero(unidades) },
          { etiqueta: 'Valor a precio de compra (Bs)', valor: moneda(redondear(valorCompra)) },
          { etiqueta: 'Valor a precio de venta (Bs)', valor: moneda(redondear(valorVenta)) },
          { etiqueta: 'Con stock bajo o sin stock', valor: entero(bajos), alerta: bajos > 0 },
        ]);
        if (filas.length === 0) {
          mensajeVacio(doc, y, 'No hay productos que coincidan con los filtros.');
        } else {
          dibujarTabla(doc, columnas, celdas, y);
        }
      },
    );

    return { buffer, nombre: `inventario-${hoyEn(this.zona)}.pdf` };
  }

  async movimientos(dto: ReporteMovimientosDto, usuario: UsuarioAutenticado) {
    const { desde, hasta } = resolverRango(this.zona, dto.desde, dto.hasta);

    const params: unknown[] = [desde, this.zona, hasta];
    const donde: string[] = [
      `m."creadoEn" >= $1::date::timestamp AT TIME ZONE $2`,
      `m."creadoEn" < ($3::date + 1)::timestamp AT TIME ZONE $2`,
    ];
    const filtros: string[] = [];

    if (dto.tipo) {
      params.push(dto.tipo);
      donde.push(`m.tipo = $${params.length}`);
      filtros.push(`Tipo: ${etiqueta(dto.tipo)}`);
    }
    if (dto.motivo) {
      params.push(dto.motivo);
      donde.push(`m.motivo = $${params.length}`);
      filtros.push(`Motivo: ${etiqueta(dto.motivo)}`);
    }
    if (dto.productoId) {
      const filas: { codigo: string; nombre: string }[] =
        await this.dataSource.query(
          `SELECT codigo, nombre FROM productos WHERE id = $1`,
          [dto.productoId],
        );
      if (filas.length === 0) throw new NotFoundException('Producto no encontrado');
      params.push(dto.productoId);
      donde.push(`m."productoId" = $${params.length}`);
      filtros.push(`Producto: ${filas[0].codigo} - ${filas[0].nombre}`);
    }
    if (dto.usuarioId) {
      const filas: { nombre: string }[] = await this.dataSource.query(
        `SELECT nombre FROM usuarios WHERE id = $1`,
        [dto.usuarioId],
      );
      if (filas.length === 0) throw new NotFoundException('Usuario no encontrado');
      params.push(dto.usuarioId);
      donde.push(`m."usuarioId" = $${params.length}`);
      filtros.push(`Usuario: ${filas[0].nombre}`);
    }

    const filas: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT m."creadoEn", p.codigo, p.nombre AS producto, m.tipo, m.motivo,
              m.cantidad, m."stockAnterior", m."stockResultante",
              m."precioUnitario"::float8 AS "precioUnitario",
              COALESCE(m.observacion, '') AS observacion,
              u.nombre AS usuario
         FROM movimientos m
         JOIN productos p ON p.id = m."productoId"
         JOIN usuarios u ON u.id = m."usuarioId"
        WHERE ${donde.join(' AND ')}
        ORDER BY m."creadoEn" ASC, m.id ASC
        LIMIT ${MAX_FILAS + 1}`,
      params,
    );
    if (filas.length > MAX_FILAS) {
      throw new BadRequestException(
        `El reporte supera ${MAX_FILAS} movimientos. Acota el rango de fechas o agrega filtros.`,
      );
    }

    let entradas = 0;
    let salidas = 0;
    let ventas = 0;
    const celdas: Celda[][] = filas.map((f) => {
      const cantidad = Number(f.cantidad);
      const precio = Number(f.precioUnitario);
      const esEntrada = f.tipo === 'entrada';
      if (esEntrada) entradas += cantidad;
      else salidas += cantidad;
      if (f.motivo === 'venta') ventas += cantidad * precio;
      return [
        formatearFechaHora(new Date(f.creadoEn as string | Date), this.zona),
        `${f.codigo} - ${f.producto}`,
        {
          texto: esEntrada ? 'Entrada' : 'Salida',
          color: esEntrada ? '#1B7F3B' : '#B42318',
          negrita: true,
        },
        etiqueta(String(f.motivo)),
        String(cantidad),
        String(f.stockAnterior),
        String(f.stockResultante),
        moneda(precio),
        String(f.usuario),
        String(f.observacion),
      ];
    });

    const columnas: Columna[] = [
      { titulo: 'Fecha y hora', ancho: 80 },
      { titulo: 'Producto', ancho: 165 },
      { titulo: 'Tipo', ancho: 48 },
      { titulo: 'Motivo', ancho: 90 },
      { titulo: 'Cant.', ancho: 36, alinear: 'right' },
      { titulo: 'Antes', ancho: 38, alinear: 'right' },
      { titulo: 'Después', ancho: 44, alinear: 'right' },
      { titulo: 'P. unit.', ancho: 52, alinear: 'right' },
      { titulo: 'Usuario', ancho: 85 },
      { titulo: 'Observación', ancho: 132 },
    ];

    const titulo = 'Reporte de movimientos';
    const ahora = formatearFechaHora(new Date(), this.zona);
    const buffer = await generarPdf(
      `${this.tienda} - ${titulo}`,
      `${this.tienda} - ${titulo}`,
      (doc) => {
        let y = encabezadoReporte(doc, this.tienda, titulo, [
          `Período: del ${formatearFecha(desde)} al ${formatearFecha(hasta)} (hora de Bolivia)`,
          `Filtros: ${filtros.length ? filtros.join(' | ') : 'ninguno'}`,
          `Generado el ${ahora} por ${usuario.correo}. Precios en bolivianos (Bs).`,
        ]);
        y = tarjetas(doc, y, [
          { etiqueta: 'Movimientos', valor: entero(filas.length) },
          { etiqueta: 'Unidades que entraron', valor: entero(entradas) },
          { etiqueta: 'Unidades que salieron', valor: entero(salidas) },
          { etiqueta: 'Valor de las ventas (Bs)', valor: moneda(redondear(ventas)) },
        ]);
        if (filas.length === 0) {
          mensajeVacio(doc, y, 'No hay movimientos en el período y con los filtros indicados.');
        } else {
          dibujarTabla(doc, columnas, celdas, y);
        }
      },
    );

    return { buffer, nombre: `movimientos-${desde}_a_${hasta}.pdf` };
  }

  // La tabla viene de una lista fija: nunca de la petición
  private async nombreDe(
    tabla: 'categorias' | 'proveedores',
    id: number,
    etiquetaEntidad: string,
  ): Promise<string> {
    const filas: { nombre: string }[] = await this.dataSource.query(
      `SELECT nombre FROM ${tabla} WHERE id = $1`,
      [id],
    );
    if (filas.length === 0) {
      throw new NotFoundException(`${etiquetaEntidad} no encontrada`);
    }
    return filas[0].nombre;
  }
}