import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BitacoraService } from '../bitacora/bitacora.service';
import { ListarBitacoraDto } from '../bitacora/dto/listar-bitacora.dto';
import { Rol } from '../usuarios/rol.enum';

@ApiTags('Bitácora (administrador)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar la bitácora de accesos (ingresos y salidas), con filtros y paginación',
  })
  listar(@Query() filtros: ListarBitacoraDto) {
    return this.bitacora.listar(filtros);
  }
}