import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Rol } from '../usuarios/rol.enum';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

// Consultar, crear y editar: cualquier usuario autenticado.
// Eliminar y restaurar: solo administrador.
@ApiTags('Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCategoriaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
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