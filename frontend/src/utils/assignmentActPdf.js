const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points

const BRAND_PRIMARY = [0.043, 0.365, 0.639]; // Azul ChileAtiende
const BRAND_ACCENT = [0.898, 0.098, 0.082]; // Rojo ChileAtiende
const SOFT_BACKGROUND = [0.957, 0.969, 0.984];

function rgbToPdf(color) {
  return color.map((value) => value.toFixed(3)).join(' ');
}

function formatDateTime(value) {
  const dateValue = value ? new Date(value) : new Date();
  return dateValue.toLocaleString('es-CL', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

function safeText(text, fallback = '—') {
  if (!text) return fallback;
  return String(text);
}

function escapePdfText(value) {
  return safeText(value, '—').replace(/([\\()])/g, '\\$1');
}

function addText(lines, text, x, y, size, font = 'F1', color = [0, 0, 0]) {
  lines.push('BT');
  lines.push(`/${font} ${size} Tf`);
  lines.push(`${rgbToPdf(color)} rg`);
  lines.push(`${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj`);
  lines.push('ET');
}

function addLabelBlock(lines, label, value, x, y) {
  addText(lines, label, x, y, 12, 'F2', BRAND_PRIMARY);
  addText(lines, value, x, y - 16, 12, 'F1', [0, 0, 0]);
}

function buildContent(product, assignment, issuerName) {
  const margin = 40;
  const lines = [];

  // Header background
  lines.push('q');
  lines.push(`${rgbToPdf(BRAND_PRIMARY)} rg`);
  lines.push(`0 ${(PAGE_HEIGHT - 160).toFixed(2)} ${PAGE_WIDTH.toFixed(2)} 160 re f`);
  lines.push(`${rgbToPdf(BRAND_ACCENT)} rg`);
  lines.push(`0 ${(PAGE_HEIGHT - 170).toFixed(2)} ${PAGE_WIDTH.toFixed(2)} 10 re f`);
  lines.push('Q');

  // Header text
  addText(lines, 'Acta de Entrega de Producto', margin, PAGE_HEIGHT - 70, 26, 'F2', [1, 1, 1]);
  addText(
    lines,
    'Registro formal de asignación generado por Bodega',
    margin,
    PAGE_HEIGHT - 95,
    12,
    'F1',
    [0.97, 0.97, 0.97]
  );

  // Body container background and border
  lines.push('q');
  lines.push(`${rgbToPdf(SOFT_BACKGROUND)} rg`);
  lines.push(
    `${margin.toFixed(2)} ${(margin + 120).toFixed(2)} ${(PAGE_WIDTH - margin * 2).toFixed(2)} ${(PAGE_HEIGHT - 320).toFixed(2)} re f`
  );
  lines.push(`${rgbToPdf(BRAND_PRIMARY)} RG`);
  lines.push('1 w');
  lines.push(
    `${margin.toFixed(2)} ${(margin + 120).toFixed(2)} ${(PAGE_WIDTH - margin * 2).toFixed(2)} ${(PAGE_HEIGHT - 320).toFixed(2)} re S`
  );
  lines.push('Q');

  let cursorY = PAGE_HEIGHT - 200;
  addLabelBlock(
    lines,
    'Producto asignado',
    `${safeText(product?.productModel?.name || product?.name)} (Serie: ${safeText(
      product?.serialNumber || product?.productModel?.serialNumber
    )})`,
    margin + 10,
    cursorY
  );
  cursorY -= 50;

  addLabelBlock(
    lines,
    'Fecha y hora de entrega',
    formatDateTime(assignment?.assignmentDate || assignment?.createdAt),
    margin + 10,
    cursorY
  );
  cursorY -= 50;

  addLabelBlock(
    lines,
    'Responsable de bodega (quien entrega)',
    safeText(issuerName, 'Responsable no registrado'),
    margin + 10,
    cursorY
  );
  cursorY -= 50;

  addLabelBlock(
    lines,
    'Asignado a',
    `${safeText(assignment?.assignedTo)} — ${safeText(assignment?.assignedEmail, 'Correo no registrado')}`,
    margin + 10,
    cursorY
  );
  cursorY -= 50;

  addLabelBlock(lines, 'Ubicación de entrega', safeText(assignment?.location), margin + 10, cursorY);
  cursorY -= 50;

  if (assignment?.notes) {
    addLabelBlock(lines, 'Observaciones', assignment.notes, margin + 10, cursorY);
    cursorY -= 50;
  }

  // Signature area
  const signatureY = margin + 170;
  const lineWidth = (PAGE_WIDTH - margin * 2 - 40) / 2;

  addText(lines, 'Firmas de recepción', margin + 10, signatureY + 40, 14, 'F2', BRAND_PRIMARY);

  lines.push(`${rgbToPdf([0.2, 0.2, 0.2])} RG`);
  lines.push('1 w');
  lines.push(`${(margin + 10).toFixed(2)} ${signatureY.toFixed(2)} m`);
  lines.push(`${(margin + 10 + lineWidth).toFixed(2)} ${signatureY.toFixed(2)} l`);
  lines.push('S');
  addText(lines, 'Entrega - Responsable de bodega', margin + 10, signatureY - 14, 11, 'F1');

  lines.push(`${(margin + 30 + lineWidth).toFixed(2)} ${signatureY.toFixed(2)} m`);
  lines.push(`${(margin + 30 + lineWidth * 2).toFixed(2)} ${signatureY.toFixed(2)} l`);
  lines.push('S');
  addText(lines, 'Recepción - Persona asignada', margin + 30 + lineWidth, signatureY - 14, 11, 'F1');

  addText(
    lines,
    'Al firmar, ambas partes confirman la recepción conforme del producto.',
    margin + 10,
    margin + 120,
    11,
    'F1',
    [0.25, 0.25, 0.25]
  );

  return lines.join('\n');
}

function buildPdf(product, assignment, issuerName) {
  const content = buildContent(product, assignment, issuerName);
  const encoder = new TextEncoder();

  const objects = [];
  const addObject = (body) => {
    const id = objects.length + 1;
    objects.push({ id, body });
    return id;
  };

  const lengthId = addObject('0');
  const contentId = addObject(null); // placeholder
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageId = addObject(
    `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
  );
  const pagesId = addObject(`<< /Type /Pages /Count 1 /Kids [${pageId} 0 R] >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // Update page parent now that pagesId is known
  objects[pageId - 1].body = objects[pageId - 1].body.replace('0 0 R', `${pagesId} 0 R`);

  const contentBytes = encoder.encode(content);
  const contentLength = contentBytes.length;
  objects[lengthId - 1].body = `${contentLength}`;
  objects[contentId - 1].body = `<< /Length ${lengthId} 0 R >>\nstream\n${content}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach(({ id, body }) => {
    offsets.push(pdf.length);
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    const offset = offsets[i].toString().padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  const pdfBytes = encoder.encode(pdf);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function openAssignmentActPdf({ product, assignment, issuerName }) {
  const blob = buildPdf(product, assignment, issuerName);
  const url = window.URL.createObjectURL(blob);
  const pdfWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!pdfWindow) {
    window.alert('Acta generada. Permite las ventanas emergentes para ver el PDF.');
  }
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 60_000);
}
