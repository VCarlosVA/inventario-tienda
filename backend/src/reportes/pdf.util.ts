import PDFDocument = require('pdfkit');

export type Doc = InstanceType<typeof PDFDocument>;

export interface Columna {
  titulo: string;
  ancho: number;
  alinear?: 'left' | 'right' | 'center';
}

export type Celda =
  | string
  | { texto: string; color?: string; negrita?: boolean };

const AZUL = '#1F3864';
const GRIS_FILA = '#F2F5FA';
const LINEA = '#D0D7E2';

export const anchoUtil = (doc: Doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

/** Crea el PDF (A4 horizontal), ejecuta `construir`, numera las páginas y devuelve el archivo */
export function generarPdf(
  titulo: string,
  pie: string,
  construir: (doc: Doc) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      bufferPages: true,
      info: { Title: titulo, Author: 'Sistema de Control de Inventario' },
    });
    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);
    try {
      construir(doc);
      numerarPaginas(doc, pie);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/** Banner con el título y la tienda, más líneas de detalle. Devuelve la posición Y siguiente */
export function encabezadoReporte(
  doc: Doc,
  tienda: string,
  titulo: string,
  lineas: string[],
): number {
  const x = doc.page.margins.left;
  const w = anchoUtil(doc);
  const y = doc.page.margins.top;

  doc.rect(x, y, w, 46).fill(AZUL);
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(titulo, x + 12, y + 8, { width: w - 24, lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(tienda, x + 12, y + 28, { width: w - 24, lineBreak: false });

  let cy = y + 56;
  doc.fillColor('#404040').font('Helvetica').fontSize(9);
  for (const linea of lineas) {
    doc.text(linea, x, cy, { width: w });
    cy = doc.y + 2;
  }
  return cy + 8;
}

/** Fila de tarjetas con cifras clave. Devuelve la posición Y siguiente */
export function tarjetas(
  doc: Doc,
  y: number,
  items: { etiqueta: string; valor: string; alerta?: boolean }[],
): number {
  const x0 = doc.page.margins.left;
  const separacion = 8;
  const alto = 42;
  const ancho =
    (anchoUtil(doc) - separacion * (items.length - 1)) / items.length;

  items.forEach((it, i) => {
    const x = x0 + i * (ancho + separacion);
    const fondo = it.alerta ? '#FDECEA' : '#EAF1FB';
    const acento = it.alerta ? '#B42318' : '#2E75B6';
    doc.rect(x, y, ancho, alto).fill(fondo);
    doc.rect(x, y, 3, alto).fill(acento);
    doc
      .fillColor(it.alerta ? '#B42318' : AZUL)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(it.valor, x + 10, y + 7, { width: ancho - 14, lineBreak: false });
    doc
      .fillColor('#595959')
      .font('Helvetica')
      .fontSize(8)
      .text(it.etiqueta, x + 10, y + 27, { width: ancho - 14, lineBreak: false });
  });
  return y + alto + 12;
}

export function mensajeVacio(doc: Doc, y: number, mensaje: string): void {
  doc
    .fillColor('#595959')
    .font('Helvetica-Oblique')
    .fontSize(11)
    .text(mensaje, doc.page.margins.left, y + 4, { width: anchoUtil(doc) });
}

/** Tabla con cabecera que se repite en cada página y filas alternadas */
export function dibujarTabla(
  doc: Doc,
  columnas: Columna[],
  filas: Celda[][],
  yInicial: number,
): number {
  const x0 = doc.page.margins.left;
  const FUENTE = 8;
  const PAD = 4;
  const ancho = columnas.reduce((s, c) => s + c.ancho, 0);
  const limiteInferior = () =>
    doc.page.height - doc.page.margins.bottom - 20; // deja espacio para el pie de página
  let y = yInicial;

  const texto = (c: Celda) => (typeof c === 'string' ? c : c.texto);
  const negrita = (c: Celda) => typeof c !== 'string' && !!c.negrita;
  const color = (c: Celda) =>
    typeof c !== 'string' && c.color ? c.color : '#262626';

  const cabecera = () => {
    doc.rect(x0, y, ancho, 20).fill(AZUL);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(FUENTE);
    let x = x0;
    for (const c of columnas) {
      doc.text(c.titulo, x + PAD, y + 6, {
        width: c.ancho - PAD * 2,
        align: c.alinear ?? 'left',
        lineBreak: false,
      });
      x += c.ancho;
    }
    y += 20;
  };

  cabecera();

  filas.forEach((fila, i) => {
    doc.fontSize(FUENTE);
    const alturas = fila.map((celda, j) => {
      doc.font(negrita(celda) ? 'Helvetica-Bold' : 'Helvetica');
      return doc.heightOfString(texto(celda), {
        width: columnas[j].ancho - PAD * 2,
      });
    });
    const alto = Math.max(...alturas) + PAD * 2;

    if (y + alto > limiteInferior()) {
      doc.addPage();
      y = doc.page.margins.top;
      cabecera();
    }

    if (i % 2 === 1) doc.rect(x0, y, ancho, alto).fill(GRIS_FILA);

    let x = x0;
    fila.forEach((celda, j) => {
      doc
        .fillColor(color(celda))
        .font(negrita(celda) ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(FUENTE)
        .text(texto(celda), x + PAD, y + PAD, {
          width: columnas[j].ancho - PAD * 2,
          align: columnas[j].alinear ?? 'left',
        });
      x += columnas[j].ancho;
    });

    doc
      .moveTo(x0, y + alto)
      .lineTo(x0 + ancho, y + alto)
      .lineWidth(0.5)
      .strokeColor(LINEA)
      .stroke();
    y += alto;
  });

  return y;
}

/** "Página 1 de 3" y un texto a la izquierda en todas las páginas */
function numerarPaginas(doc: Doc, izquierda: string): void {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const x = doc.page.margins.left;
    const w = anchoUtil(doc);
    const y = doc.page.height - 26;
    // El pie está dentro del margen inferior: se anula un instante para que no cree otra página
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor('#7F7F7F');
    doc.text(izquierda, x, y, { width: w / 2, align: 'left', lineBreak: false });
    doc.text(`Página ${i + 1} de ${rango.count}`, x + w / 2, y, {
      width: w / 2,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = margenInferior;
  }
}