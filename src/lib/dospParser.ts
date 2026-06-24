import { parseAmount, parseDate } from "./fileParser";

export interface DospEntry {
  date: string;
  comprobante: string;
  reference: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface DospParseResult {
  entries: DospEntry[];
  warnings: string[];
}

const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build";

const INCOME_COMPS = new Set(["CBCC", "DEPB"]);
const EXPENSE_COMPS = new Set(["OP", "EC", "EB"]);
const KNOWN_COMPS = new Set([...INCOME_COMPS, ...EXPENSE_COMPS]);

// Argentine amount token: 1,864,000.00 or 471,898.00
function isAmtToken(s: string): boolean {
  return /^\d{1,3}(\.\d{3})*,\d{2}$/.test(s) || /^\d{1,9},\d{2}$/.test(s);
}

// Rows to skip (headers, footers, separators)
const SKIP = [
  /^HOJA\s+\d/i,
  /^SUCU:/i,
  /FRUTIHORTICOLA/i,
  /LISTADO DE CUENTAS/i,
  /PERIODO DE ACREDITA/i,
  /POR FECHA ACREDITA/i,
  /^-{5,}/,
  /^={5,}/,
  /^CA\s+FECHAS/i,
  /^JA\s+ACREDIT/i,
  /SALDO CTA/i,
  /DEL PERIODO ANTERIOR/i,
];

interface PdfItem { str: string; x: number; y: number; }

export async function parseDospPDF(file: File): Promise<DospParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjsLib: any;
  try {
    pdfjsLib = await import(/* @vite-ignore */ `${PDFJS_CDN}/pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
    if (typeof pdfjsLib.getDocument !== "function") throw new Error("no api");
  } catch {
    return { entries: [], warnings: ["No se pudo cargar el lector de PDF (requiere conexión)"] };
  }

  let buf: ArrayBuffer;
  try { buf = await file.arrayBuffer(); }
  catch { return { entries: [], warnings: ["No se pudo leer el archivo"] }; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any;
  try { pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise; }
  catch { return { entries: [], warnings: ["No se pudo parsear el PDF"] }; }

  const entries: DospEntry[] = [];
  const warnings: string[] = [];

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const content = await page.getTextContent();

    const items: PdfItem[] = [];
    for (const item of content.items) {
      const s = (item.str as string)?.trim();
      if (!s) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = item as any;
      items.push({ str: s, x: t.transform[4], y: t.transform[5] });
    }

    // Group by Y (±3pt), sort top→bottom, each row sorted left→right
    const yMap = new Map<number, PdfItem[]>();
    for (const item of items) {
      let found = false;
      for (const ky of yMap.keys()) {
        if (Math.abs(ky - item.y) <= 3) { yMap.get(ky)!.push(item); found = true; break; }
      }
      if (!found) yMap.set(item.y, [item]);
    }
    const rows = [...yMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => row.sort((a, b) => a.x - b.x).map(i => i.str));

    for (const tokens of rows) {
      const rowText = tokens.join(" ");

      // Skip headers/footers
      if (SKIP.some((re) => re.test(rowText))) continue;

      // Bank section headers like "1 - SANTANDER" — skip
      if (/^\d+\s*-\s*[A-Z]+\s*$/.test(rowText.trim())) continue;

      // Data rows start with "1" (CA column) then a DD/MM/YY date
      if (tokens[0] !== "1") continue;
      if (!/^\d{1,2}\/\d{2}\/\d{2,4}$/.test(tokens[1] ?? "")) continue;

      const comprobante = tokens[3];
      if (!KNOWN_COMPS.has(comprobante)) continue;

      const date = parseDate(tokens[1]);
      if (!date) continue;

      // Find the last two amount tokens (transaction_amount, running_saldo)
      // Work backwards: collect up to 2 amount tokens
      const amtValues: number[] = [];
      let firstAmtIdx = tokens.length;
      for (let i = tokens.length - 1; i >= 5 && amtValues.length < 2; i--) {
        if (isAmtToken(tokens[i])) {
          const v = parseAmount(tokens[i]);
          if (v !== null) {
            amtValues.unshift(v);
            firstAmtIdx = i;
          }
        } else if (amtValues.length > 0) {
          // Stop once we hit a non-amount after finding amounts
          break;
        }
      }

      if (amtValues.length === 0) {
        warnings.push(`Fila sin monto reconocido: ${rowText.slice(0, 60)}`);
        continue;
      }

      // First of the collected amounts is the transaction amount (second-to-last in row)
      const txAmt = amtValues[0];
      if (txAmt === 0) continue;

      // Description: tokens[5..firstAmtIdx-1], strip trailing dots
      const reference = tokens[4] ?? "";
      const descTokens = tokens.slice(5, firstAmtIdx);
      const description = descTokens
        .join(" ")
        .replace(/\.{3,}/g, "")
        .trim() || reference;

      const type: "income" | "expense" = INCOME_COMPS.has(comprobante) ? "income" : "expense";
      const amount = type === "income" ? Math.abs(txAmt) : -Math.abs(txAmt);

      entries.push({ date, comprobante, reference, description, amount, type });
    }
  }

  return { entries, warnings };
}
