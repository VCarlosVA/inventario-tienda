import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { hoyEn, resolverRango, ZONA_POR_DEFECTO } from '../comun/formato';
import {
  MasVendidosDto,
  RangoFechasDto,
  StockDto,
} from './dto/estadisticas.dto';

const redondear = (n: unknown) => Math.round(Number(n) * 100) / 100;

// Filtro de fechas: $1 = desde, $2 = zona horaria, $3 = hasta (días completos en hora local)
const FILTRO_FECHAS = `m."creadoEn" >= $1::date::timestamp AT TIME ZONE $2
                   AND m."creadoEn" < ($3::date + 1)::timestamp AT TIME ZONE $2`;
const ES_VENTA = `m.tipo = 'salida' AND m.motivo = 'venta'`;

@Injectable()
export class EstadisticasService {
  private readonly zona: string;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.zona = config.get<string>('ZONA_HORARIA') ?? ZONA_POR_DEFECTO;
  }

  async resumen() {
    const [inv] = await this.dataSource.query(
      `SELECT COUNT(*)::float8 AS "totalProductos",
              COALESCE(SUM(stock), 0)::float8 AS "unidadesEnStock",
              COALESCE(SUM(stock * "precioCompra"), 0)::float8 AS "valorCompra",
              COALESCE(SUM(stock * "precioVenta"), 0)::float8 AS "valorVenta",
              COUNT(*) FILTER (WHERE stock <= "stockMinimo")::float8 AS "stockBajo",
              COUNT(*) FILTER (WHERE stock = 0)::float8 AS "sinStock"
         FROM productos
        WHERE "eliminadoEn" IS NULL`,
    );

    const hoy = hoyEn(this.zona);
    const inicioMes = `${hoy.slice(0, 8)}01`;
    const ventasHoy = await this.ventas(hoy, hoy);
    const ventasMes = await this.ventas(inicioMes, hoy);

    return {
      generadoEn: new Date().toISOString(),
      zonaHoraria: this.zona,
      inventario: {
        totalProductos: Number(inv.totalProductos),
        unidadesEnStock: Number(inv.unidadesEnStock),
        valorInventarioCompra: redondear(inv.valorCompra),
        valorInventarioVenta: redondear(inv.valorVenta),
        // incluye los productos sin stock
        productosStockBajo: Number(inv.stockBajo),
        productosSinStock: Number(inv.sinStock),
      },
      ventasHoy: { fecha: hoy, ...ventasHoy },
      ventasMes: { desde: inicioMes, hasta: hoy, ...ventasMes },
    };
  }

  async masVendidos(dto: MasVendidosDto) {
    const { desde, hasta } = resolverRango(this.zona, dto.desde, dto.hasta);
    const filas: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT p.id, p.codigo, p.nombre,
              SUM(m.cantidad)::float8 AS unidades,
              SUM(m.cantidad * m."precioUnitario")::float8 AS ingresos
         FROM movimientos m
         JOIN productos p ON p.id = m."productoId"
        WHERE ${ES_VENTA} AND ${FILTRO_FECHAS}
        GROUP BY p.id, p.codigo, p.nombre
        ORDER BY unidades DESC, p.nombre ASC
        LIMIT $4`,
      [desde, this.zona, hasta, dto.limite ?? 10],
    );
    return {
      desde,
      hasta,
      datos: filas.map((f) => ({
        productoId: Number(f.id),
        codigo: f.codigo,
        nombre: f.nombre,
        unidades: Number(f.unidades),
        ingresos: redondear(f.ingresos),
      })),
    };
  }

  async stock(dto: StockDto) {
    const filas: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT id, codigo, nombre, stock, "stockMinimo", unidad
         FROM productos
        WHERE "eliminadoEn" IS NULL
          ${dto.soloBajo ? 'AND stock <= "stockMinimo"' : ''}
        ORDER BY (stock - "stockMinimo") ASC, nombre ASC
        LIMIT $1`,
      [dto.limite ?? 15],
    );
    return {
      datos: filas.map((f) => {
        const stock = Number(f.stock);
        const minimo = Number(f.stockMinimo);
        return {
          productoId: Number(f.id),
          codigo: f.codigo,
          nombre: f.nombre,
          unidad: f.unidad,
          stock,
          stockMinimo: minimo,
          estado: stock === 0 ? 'sin_stock' : stock <= minimo ? 'bajo' : 'normal',
        };
      }),
    };
  }

  async movimientosPorDia(dto: RangoFechasDto) {
    const { desde, hasta } = resolverRango(this.zona, dto.desde, dto.hasta);
    const filas: Record<string, unknown>[] = await this.dataSource.query(
      `WITH dias AS (
         SELECT generate_series($1::date, $2::date, interval '1 day')::date AS dia
       ),
       mov AS (
         SELECT (m."creadoEn" AT TIME ZONE $3)::date AS dia,
                SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE 0 END) AS entradas,
                SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad ELSE 0 END) AS salidas
           FROM movimientos m
          WHERE m."creadoEn" >= $1::date::timestamp AT TIME ZONE $3
            AND m."creadoEn" < ($2::date + 1)::timestamp AT TIME ZONE $3
          GROUP BY 1
       )
       SELECT to_char(d.dia, 'YYYY-MM-DD') AS fecha,
              COALESCE(mov.entradas, 0)::float8 AS entradas,
              COALESCE(mov.salidas, 0)::float8 AS salidas
         FROM dias d
         LEFT JOIN mov ON mov.dia = d.dia
        ORDER BY d.dia`,
      [desde, hasta, this.zona],
    );
    return {
      desde,
      hasta,
      datos: filas.map((f) => ({
        fecha: f.fecha,
        entradas: Number(f.entradas),
        salidas: Number(f.salidas),
      })),
    };
  }

  async ventasPorCategoria(dto: RangoFechasDto) {
    const { desde, hasta } = resolverRango(this.zona, dto.desde, dto.hasta);
    const filas: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT c.id AS "categoriaId", c.nombre AS categoria,
              SUM(m.cantidad)::float8 AS unidades,
              SUM(m.cantidad * m."precioUnitario")::float8 AS ingresos
         FROM movimientos m
         JOIN productos p ON p.id = m."productoId"
         JOIN categorias c ON c.id = p."categoriaId"
        WHERE ${ES_VENTA} AND ${FILTRO_FECHAS}
        GROUP BY c.id, c.nombre
        ORDER BY ingresos DESC, c.nombre ASC`,
      [desde, this.zona, hasta],
    );
    return {
      desde,
      hasta,
      datos: filas.map((f) => ({
        categoriaId: Number(f.categoriaId),
        categoria: f.categoria,
        unidades: Number(f.unidades),
        ingresos: redondear(f.ingresos),
      })),
    };
  }

  private async ventas(desde: string, hasta: string) {
    const [f] = await this.dataSource.query(
      `SELECT COALESCE(SUM(m.cantidad), 0)::float8 AS unidades,
              COALESCE(SUM(m.cantidad * m."precioUnitario"), 0)::float8 AS ingresos
         FROM movimientos m
        WHERE ${ES_VENTA} AND ${FILTRO_FECHAS}`,
      [desde, this.zona, hasta],
    );
    return { unidades: Number(f.unidades), ingresos: redondear(f.ingresos) };
  }
}