export type NivelPassword = 'débil' | 'intermedia' | 'fuerte';

export function evaluarFortaleza(password: string): {
  nivel: NivelPassword;
  tipos: number;
  longitud: number;
} {
  // Tipos de caracteres: minúsculas, mayúsculas, números y símbolos
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(password),
  ).length;
  const longitud = password.length;

  let nivel: NivelPassword = 'débil';
  if (longitud >= 12 && tipos === 4) {
    nivel = 'fuerte';
  } else if (longitud >= 8 && tipos >= 3) {
    nivel = 'intermedia';
  }
  return { nivel, tipos, longitud };
}