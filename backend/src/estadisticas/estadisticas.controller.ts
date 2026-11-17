import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  MasVendidosDto,
  RangoFechasDto,
  StockDto,
} from './dto/estadisticas.dto';
import { EstadisticasService } from './estadisticas.service';

// Cualquier usuario autenticado puede consultar las estadísticas.
// Los datos alimentan los gráficos del frontend.
@ApiTags('Estadísticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly service: EstadisticasService) {}

  @Get('resumen')
  @ApiOperation({
    summary: 'Totales para las tarjetas del inicio: productos, unidades, valor del inventario, stock bajo y ventas',
  })
  resumen() {
    return this.service.resumen();
  }

  @Get('mas-vendidos')
  @ApiOperation({
    summary: 'Productos más vendidos (unidades e ingresos) en un rango de fechas. Gráfico de barras',
  })
  masVendidos(@Query() dto: MasVendidosDto) {
    return this.service.masVendidos(dto);
  }

  @Get('stock')
  @ApiOperation({
    summary: 'Stock actual frente al mínimo de cada producto, los más críticos primero. Gráfico de barras',
  })
  stock(@Query() dto: StockDto) {
    return this.service.stock(dto);
  }

  @Get('movimientos-por-dia')
  @ApiOperation({
    summary: 'Unidades que entraron y salieron cada día (los días sin movimiento aparecen en 0). Gráfico de líneas',
  })
  movimientosPorDia(@Query() dto: RangoFechasDto) {
    return this.service.movimientosPorDia(dto);
  }

  @Get('ventas-por-categoria')
  @ApiOperation({
    summary: 'Ventas (unidades e ingresos) por categoría en un rango de fechas. Gráfico de torta',
  })
  ventasPorCategoria(@Query() dto: RangoFechasDto) {
    return this.service.ventasPorCategoria(dto);
  }
}