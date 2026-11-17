import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ListarMovimientosDto } from './dto/listar-movimientos.dto';
import { MovimientosService } from './movimientos.service';

@ApiTags('Movimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('productos')
export class MovimientosProductoController {
  constructor(private readonly service: MovimientosService) {}

  @Get(':id/movimientos')
  @ApiOperation({ summary: 'Historial de movimientos de un producto' })
  listar(
    @Param('id', ParseIntPipe) id: number,
    @Query() filtros: ListarMovimientosDto,
  ) {
    return this.service.listarDeProducto(id, filtros);
  }
}