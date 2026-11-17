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
import type { UsuarioAutenticado } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { Rol } from '../usuarios/rol.enum';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { GestionUsuariosService } from './gestion-usuarios.service';

@ApiTags('Usuarios (administrador)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('usuarios')
export class GestionUsuariosController {
  constructor(private readonly service: GestionUsuariosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  crear(@Body() dto: CreateUsuarioDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.service.eliminar(id, actual.id);
  }

  @Patch(':id/restaurar')
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.service.restaurar(id);
  }

  @Patch(':id/desbloquear')
  desbloquear(@Param('id', ParseIntPipe) id: number) {
    return this.service.desbloquear(id);
  }
}