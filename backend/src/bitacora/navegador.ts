// Convierte el User-Agent crudo en algo legible, por ejemplo "Chrome en Windows"
export function describirNavegador(ua?: string): string {
  if (!ua) return 'Desconocido';
  const navegador = /Edg(e|A|iOS)?\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\/|FxiOS\//.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /PostmanRuntime/i.test(ua)
              ? 'Postman'
              : /curl\//i.test(ua)
                ? 'curl'
                : 'Otro';
  const so = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iOS/.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return so ? `${navegador} en ${so}` : navegador;
}