import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    UsuariosModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(config.get('JWT_EXPIRES_IN_SECONDS') ?? 86400),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CaptchaService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard, UsuariosModule],
})
export class AuthModule {}