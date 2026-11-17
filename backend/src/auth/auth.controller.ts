import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { contextoDe } from './contexto-request';
import { LoginDto } from './dto/login.dto';
import { OlvidePasswordDto } from './dto/olvide-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { UsuarioAutenticado } from './jwt-auth.guard';
import { RecuperacionService } from './recuperacion.service';
import { UsuarioActual } from './usuario-actual.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly recuperacion: RecuperacionService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un usuario nuevo (rol vendedor)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Get('captcha')
  @ApiOperation({
    summary: 'Generar un CAPTCHA nuevo (4 caracteres, vigente 2 minutos, un solo uso)',
  })
  captcha() {
    return this.auth.generarCaptcha();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener el token JWT' })
  @ApiResponse({ status: 400, description: 'CAPTCHA incorrecto o vencido, o datos inválidos' })
  @ApiResponse({ status: 401, description: 'Correo o contraseña incorrectos' })
  @ApiResponse({
    status: 423,
    description:
      'Cuenta bloqueada tras 3 intentos fallidos. Indica el tiempo restante',
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, contextoDe(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión (invalida todos los tokens del usuario y registra la salida)',
  })
  logout(@UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) {
    return this.auth.logout(usuario, contextoDe(req));
  }

  @Post('olvide-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar un enlace de recuperación de contraseña por correo',
  })
  @ApiResponse({
    status: 200,
    description:
      'Responde siempre lo mismo, exista o no el correo, para no revelar qué cuentas existen',
  })
  olvidePassword(@Body() dto: OlvidePasswordDto) {
    return this.recuperacion.solicitar(dto.correo);
  }

  @Post('restablecer-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar la contraseña con el token recibido por correo',
  })
  @ApiResponse({ status: 400, description: 'Enlace inválido, vencido o ya usado' })
  restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.recuperacion.restablecer(dto.token, dto.nuevaPassword);
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Datos del usuario autenticado (requiere token)' })
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}