import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { evaluarFortaleza } from './password-strength';

const COSTO_BCRYPT = 10;
// Hash de relleno: así el login tarda lo mismo exista o no el correo
const HASH_RELLENO = hashSync('relleno-anti-timing', COSTO_BCRYPT);

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

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
    const usuario = await this.usuarios.findByCorreoConPassword(dto.correo);
    const coincide = await compare(
      dto.password,
      usuario?.password ?? HASH_RELLENO,
    );

    // Mensaje único: no revela si el correo existe o si falló la contraseña
    if (!usuario || !coincide) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

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
}