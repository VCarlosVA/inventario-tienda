import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un usuario nuevo (rol vendedor)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
}