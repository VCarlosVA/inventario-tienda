import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Rol } from '../usuarios/rol.enum';
import { CreateProductoDto } from './dto/create-producto.dto';
import { ListarProductosDto } from './dto/listar-productos.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductosService } from './productos.service';

// Consultar, crear y editar: cualquier usuario autenticado.
// Eliminar, restaurar y ver eliminados: solo administrador.
@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar productos con búsqueda, filtros (categoría, proveedor, stock bajo) y paginación',
  })
  findAll(@Query() filtros: ListarProductosDto) {
    return this.service.findAll(filtros);
  }

  // Debe ir antes de ":id" para que "eliminados" no se interprete como un id
  @Get('eliminados')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Listar productos eliminados (para poder restaurarlos)' })
  findEliminados() {
    return this.service.findEliminados();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un producto (el stock inicia en 0)' })
  create(@Body() dto: CreateProductoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un producto (el stock no se edita aquí)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/restaurar')
  @Roles(Rol.ADMIN)
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.service.restore(id);
  }
}