import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UsuarioAutenticado } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { ListarMovimientosDto } from './dto/listar-movimientos.dto';
import { MovimientosService } from './movimientos.service';

// Registrar y consultar: cualquier usuario autenticado (vendedor o administrador).
// No existen rutas para editar ni eliminar: los movimientos son un historial.
@ApiTags('Movimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movimientos')
export class MovimientosController {
  constructor(private readonly service: MovimientosService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una entrada o salida de stock (actualiza el stock del producto)',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o motivo incompatible con el tipo' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado o eliminado' })
  @ApiResponse({ status: 409, description: 'Stock insuficiente para la salida' })
  registrar(
    @Body() dto: CreateMovimientoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.service.registrar(dto, usuario);
  }

  @Get()
  @ApiOperation({
    summary: 'Historial de movimientos con filtros (producto, usuario, tipo, motivo, fechas) y paginación',
  })
  listar(@Query() filtros: ListarMovimientosDto) {
    return this.service.listar(filtros);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}