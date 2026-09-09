import { formatGs } from "./format";

/**
 * Generador de comprobantes en PDF, escrito a mano a propósito:
 * sin dependencias nuevas (nada que rompa el deploy de Vercel) y con
 * streams sin comprimir, así el archivo es chico y auditabile.
 *
 * Es un COMPROBANTE INTERNO de compra: no reemplaza una factura fiscal
 * (esa necesita timbrado DNIT).
 *
 * Solo soporta WinAnsi (latín 1): suficiente para el español paraguayo.
 */

// ─── primitivas de PDF ────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Ancho aproximado del texto en Helvetica (para alinear a la derecha). */
function textWidth(s: string, size: number, bold = false): number {
  // Helvetica: ~0.5 em promedio para texto mixto; bold ~0.53.
  return s.length * size * (bold ? 0.53 : 0.5);
}

function line(buf: string[], x: number, y: number, text: string, size: number, bold = false) {
  buf.push(
    `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`
  );
}

function lineRight(buf: string[], xRight: number, y: number, text: string, size: number, bold = false) {
  const x = xRight - textWidth(text, size, bold);
  line(buf, x, y, text, size, bold);
}

function rule(buf: string[], x: number, y: number, w: number) {
  buf.push(`${x} ${y} ${w} 0.8 re f`);
}

function hrule(buf: string[], x: number, y: number, h: number) {
  buf.push(`${x} ${y} 0.8 ${h} re f`);
}

// ─── datos del comprobante ────────────────────────────────────────────

export interface InvoiceData {
  code: string;
  brandName: string;
  brandTagline?: string | null;
  customerName: string;
  customerPhone: string;
  addressLabel: string;
  items: { quantity: number; name: string; unitPrice: number }[];
  subtotal: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  changeFrom?: number | null;
  deliveredAt: string; // ya formateado
  company: { name: string; email: string; phone: string };
}

// ─── armado del documento ─────────────────────────────────────────────

export function buildInvoicePdf(inv: InvoiceData): Buffer {
  const W = 595.28; // A4
  const H = 841.89;
  const L = 48;
  const R = W - 48;
  const c: string[] = [];

  // Encabezado
  line(c, L, H - 64, "AquaGo", 20, true);
  lineRight(c, R, H - 58, "COMPROBANTE DE COMPRA", 11, true);
  lineRight(c, R, H - 72, "Documento interno - no constituye factura", 8);
  rule(c, L, H - 80, R - L);

  // Marca vendedora
  line(c, L, H - 104, inv.brandName, 14, true);
  if (inv.brandTagline) line(c, L, H - 118, inv.brandTagline, 9);

  // Pedido + estado
  lineRight(c, R, H - 104, `Pedido ${inv.code}`, 12, true);
  lineRight(c, R, H - 118, `Entregado: ${inv.deliveredAt}`, 9);

  // Cliente
  let y = H - 148;
  line(c, L, y, "Cliente", 9, true);
  line(c, L, y - 14, inv.customerName, 11);
  line(c, L, y - 28, `Tel: ${inv.customerPhone}`, 10);
  line(c, L, y - 42, `Direccion: ${inv.addressLabel}`, 10);

  // Método de pago (columna derecha)
  const metodo =
    inv.paymentMethod === "transferencia" ? "Transferencia (aconsignada a AquaGo)" : "Efectivo";
  lineRight(c, R, y, "Pago", 9, true);
  lineRight(c, R, y - 14, metodo, 10);
  if (inv.paymentMethod === "efectivo" && inv.changeFrom) {
    lineRight(c, R, y - 28, `Paga con: ${formatGs(inv.changeFrom)}`, 9);
  }

  // Tabla de items
  y = y - 70;
  rule(c, L, y, R - L);
  y -= 16;
  line(c, L, y, "Cant", 9, true);
  line(c, 84, y, "Detalle", 9, true);
  lineRight(c, 400, y, "P. unitario", 9, true);
  lineRight(c, R, y, "Importe", 9, true);
  rule(c, L, y - 6, R - L);

  y -= 24;
  for (const it of inv.items) {
    line(c, L, y, `${it.quantity} x`, 10);
    const nombre = it.name.length > 44 ? `${it.name.slice(0, 43)}…` : it.name;
    line(c, 84, y, nombre, 10);
    lineRight(c, 400, y, formatGs(it.unitPrice), 10);
    lineRight(c, R, y, formatGs(it.quantity * it.unitPrice), 10);
    y -= 18;
  }

  y -= 6;
  rule(c, L, y, R - L);
  y -= 22;

  // Totales (alineados a la derecha)
  lineRight(c, 400, y, "Subtotal", 10);
  lineRight(c, R, y, formatGs(inv.subtotal), 10);
  y -= 16;
  lineRight(c, 400, y, "Servicio de app", 10);
  lineRight(c, R, y, formatGs(inv.serviceFee), 10);
  y -= 24;
  line(c, 330, y, "TOTAL", 13, true);
  lineRight(c, R, y, formatGs(inv.total), 13, true);

  // Nota de agradecimiento
  y -= 40;
  line(c, L, y, "Gracias por pedir con AquaGo. Podes seguir tus pedidos y", 9);
  line(c, L, y - 12, "descargar tus comprobantes desde la app en aquago.company.", 9);

  // Pie fijo
  line(c, L, 64, "Comprobante interno generado automaticamente por AquaGo.", 8);
  line(
    c,
    L,
    52,
    `${inv.company.name} · ${inv.company.email} · ${inv.company.phone} · aquago.company`,
    8
  );

  const content = c.join("\n");

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
