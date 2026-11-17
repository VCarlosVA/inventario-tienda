import {
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UsuarioAutenticado } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { ReporteInventarioDto } from './dto/reporte-inventario.dto';
import { ReporteMovimientosDto } from './dto/reporte-movimientos.dto';
import { ReportesService } from './reportes.service';

const PDF = {
  description: 'Archivo PDF',
  content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
};

// Vendedores y administradores pueden generar reportes.
@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('inventario')
  @Header('Cache-Control', 'no-store')
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Reporte en PDF del inventario actual (filtros: categoría, proveedor, stock bajo)',
  })
  @ApiResponse({ status: 200, ...PDF })
  async inventario(
    @Query() dto: ReporteInventarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const { buffer, nombre } = await this.service.inventario(dto, usuario);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nombre}"`,
      length: buffer.length,
    });
  }

  @Get('movimientos')
  @Header('Cache-Control', 'no-store')
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Reporte en PDF de movimientos (rango de fechas obligatorio, máximo 366 días)',
  })
  @ApiResponse({ status: 200, ...PDF })
  async movimientos(
    @Query() dto: ReporteMovimientosDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const { buffer, nombre } = await this.service.movimientos(dto, usuario);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nombre}"`,
      length: buffer.length,
    });
  }
}