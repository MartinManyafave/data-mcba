import { parseDate } from "./fileParser";

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

// DOSP prints amounts in US format: 1,864,000.00 (comma=thousands, dot=decimal)
function parseDospAmount(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ""));
  return isNaN(v) ? null : v;
}

// Rows to skip (headers, footers, separators)
const SKIP = [
  /SUCU:/i,
  /FRUTIHORTICOLA/i,
  /LISTADO DE CUENTAS/i,
  /PERIODO DE ACREDITA/i,
  /POR FECHA ACREDITA/i,
  /^-{5,}/,
  /^={5,}/,
  /^CA\s+FECHAS/i,
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

      if (SKIP.some((re) => re.test(rowText))) continue;

      // Data rows: tokens[0] = "1 DD/MM/YY" (CA column + date merged by PDF renderer)
      //            tokens[1] = "DD/MM/YY" (accrual date, same date)
      //            tokens[2] = comprobante (CBCC | DEPB | OP | EC | EB)
      //            tokens[3..n-3] = reference + description
      //            tokens[n-2] = transaction amount (US format: 1,864,000.00)
      //            tokens[n-1] = running saldo (ignored)
      if (!/^1\s+\d{1,2}\/\d{2}\/\d{2,4}$/.test(tokens[0])) continue;
      const comprobante = tokens[2];
      if (!KNOWN_COMPS.has(comprobante)) continue;
      if (tokens.length < 5) continue;

      const date = parseDate(tokens[1]);
      if (!date) continue;

      const txAmt = parseDospAmount(tokens[tokens.length - 2]);
      if (txAmt === null || txAmt === 0) {
        warnings.push(`Fila sin monto reconocido: ${rowText.slice(0, 80)}`);
        continue;
      }

      // Description: all tokens between comprobante and the two trailing amount tokens,
      // stripping dot-sequences (............) used as column fillers
      const descRaw = tokens.slice(3, tokens.length - 2).join(" ").replace(/\.{3,}/g, "").trim();
      const reference = tokens[3]?.replace(/\.{3,}/g, "").trim() ?? "";
      const description = descRaw || reference;

      const type: "income" | "expense" = INCOME_COMPS.has(comprobante) ? "income" : "expense";
      const amount = type === "income" ? Math.abs(txAmt) : -Math.abs(txAmt);

      entries.push({ date, comprobante, reference, description, amount, type });
    }
  }

  return { entries, warnings };
}
