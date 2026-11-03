import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CaptchaService } from './captcha.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { evaluarFortaleza } from './password-strength';

const COSTO_BCRYPT = 10;
// Hash de relleno: así el login tarda lo mismo exista o no el correo
const HASH_RELLENO = hashSync('relleno-anti-timing', COSTO_BCRYPT);

function tiempoLegible(segundos: number): string {
  if (segundos >= 60) {
    const minutos = Math.ceil(segundos / 60);
    return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  }
  return `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;
}

@Injectable()
export class AuthService {
  private readonly maxIntentos: number;
  private readonly minutosBloqueo: number;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly captcha: CaptchaService,
  ) {
    this.maxIntentos = Number(config.get('LOGIN_MAX_INTENTOS') ?? 3);
    this.minutosBloqueo = Number(config.get('LOGIN_BLOQUEO_MINUTOS') ?? 5);
  }

  generarCaptcha() {
    return this.captcha.generar();
  }

  async register(dto: RegisterDto) {
    if (await this.usuarios.findByCorreo(dto.correo)) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const { nivel } = evaluarFortaleza(dto.password);
    const passwordCifrada = await hash(dto.password, COSTO_BCRYPT);

    try {
      const usuario = await this.usuarios.crear({
        nombre: dto.nombre,
        correo: dto.correo,
        password: passwordCifrada,
      });

      return {
        mensaje: 'Usuario registrado correctamente',
        nivelPassword: nivel,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
        },
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    // 1) El CAPTCHA se comprueba primero. Si falla, no se mira la contraseña
    //    y NO cuenta como intento fallido para el bloqueo de la cuenta.
    if (!this.captcha.validar(dto.captchaId, dto.captchaTexto)) {
      throw new BadRequestException(
        'CAPTCHA incorrecto o vencido. Solicita uno nuevo.',
      );
    }

    const usuario = await this.usuarios.findByCorreoConPassword(dto.correo);

    if (usuario) {
      await this.usuarios.liberarSiVencido(usuario.id);
      const segundos = await this.usuarios.segundosDeBloqueo(usuario.id);
      if (segundos > 0) throw this.cuentaBloqueada(segundos);
    }

    const coincide = await compare(
      dto.password,
      usuario?.password ?? HASH_RELLENO,
    );

    if (!usuario || !coincide) {
      if (usuario) {
        const { bloqueado } = await this.usuarios.registrarFalloLogin(
          usuario.id,
          this.maxIntentos,
          this.minutosBloqueo,
        );
        if (bloqueado) {
          throw this.cuentaBloqueada(
            await this.usuarios.segundosDeBloqueo(usuario.id),
          );
        }
      }
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    await this.usuarios.reiniciarIntentos(usuario.id);

    const access_token = await this.jwt.signAsync({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    return {
      access_token,
      tipo: 'Bearer',
      expiraEnSegundos: Number(
        this.config.get('JWT_EXPIRES_IN_SECONDS') ?? 86400,
      ),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }

  private cuentaBloqueada(segundos: number) {
    return new HttpException(
      {
        statusCode: 423,
        error: 'Locked',
        message: `Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en ${tiempoLegible(segundos)}.`,
        segundosRestantes: segundos,
      },
      423,
    );
  }
}