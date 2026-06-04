import Papa from "papaparse";
import * as XLSX from "xlsx";
import { detectCategory } from "./categoryDetector";

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  reference?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  warnings: string[];
  totalRows: number;
}

// ─── Amount parsing ───────────────────────────────────────────────────────────

export function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && /^#+$/.test(value.trim())) return null; // Excel display overflow
  if (typeof value === "number") return isNaN(value) ? null : value;

  let s = String(value).replace(/[$\s]/g, "").trim();
  if (!s || s === "-") return null;

  // Accounting parentheses notation: (1.234,56) = -1234.56
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const dotCount = (s.match(/\./g) ?? []).length;

  // Determine whether this is Argentine format (dot=thousands, comma=decimal)
  // or US/XLSX format (comma=thousands, dot=decimal).
  //
  // Argentine if ANY of:
  //   1. Comma appears AFTER the last dot  ("17.200,00", "1.307.000,00")
  //   2. Multiple dots                     ("1.307.000"  — dots are thousands seps)
  //   3. Single dot + exactly 3 trailing digits, no comma ("17.200" → 17200)
  const isArgentine =
    lastComma > lastDot ||
    dotCount > 1 ||
    (dotCount === 1 && lastComma === -1 && /\.\d{3}$/.test(s));

  const normalized = isArgentine
    ? s.replace(/\./g, "").replace(",", ".")   // remove thousand-dots, comma→decimal
    : s.replace(/,/g, "");                      // remove thousand-commas, keep dot

  const n = parseFloat(normalized);
  if (isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function excelSerialToDate(serial: number): string | null {
  const d = Math.floor(serial);
  if (d < 40000 || d > 65000) return null;
  // 25569 = days from Excel epoch (Dec 30, 1899) to Unix epoch (Jan 1, 1970)
  const date = new Date((d - 25569) * 86400 * 1000);
  if (isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  if (y < 1990 || y > 2100) return null;
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && /^#+$/.test(value.trim())) return null; // Excel display overflow

  // Numeric → Excel serial date
  if (typeof value === "number") return excelSerialToDate(value);

  const s = String(value).trim();
  if (!s) return null;

  // DD/MM/YYYY or DD-MM-YYYY (Argentine standard)
  const ar = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ar) {
    const [, d, m, y] = ar;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD/MM/YY (2-digit year, used by Credicoop & Santander PDF statements)
  const ar2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (ar2) {
    const [, d, m, y2] = ar2;
    const year = parseInt(y2) >= 90 ? `19${y2}` : `20${y2}`;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Numeric string that might be Excel serial (e.g. "46206.99")
  const num = parseFloat(s);
  if (!isNaN(num) && num > 40000 && num < 65000) return excelSerialToDate(num);

  return null;
}

// ─── Column mapping ───────────────────────────────────────────────────────────

interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  creditCol?: number;
  debitCol?: number;
  operationCol?: number;
  referenceCol?: number;
}

/** Ordered priority search: first keyword group that finds a column wins */
function findCol(lower: string[], ...groups: string[][]): number {
  for (const keywords of groups) {
    const idx = lower.findIndex((h) => keywords.some((k) => h.includes(k)));
    if (idx >= 0) return idx;
  }
  return -1;
}

function guessColumns(headers: unknown[]): ColumnMapping {
  const lower = headers.map((h) => String(h ?? "").toLowerCase().trim());

  const dateCol = findCol(lower,
    ["fecha de ejecución", "fecha de ejec"],
    ["fecha"],
  );

  const descCol = findCol(lower,
    ["concepto"],
    ["descripcion", "descripción", "description"],
    ["detalle"],
    ["motivo", "glosa"],
    ["operación", "operacion"],
  );

  // Prioritize "importe" and "monto" over generic "valor" to avoid
  // matching "Fecha Valor" or "Valor de cuotaparte" in superfondos
  const amountCol = findCol(lower,
    ["importe pesos", "importe en pesos"],
    ["importe"],
    ["monto neto"],
    ["monto"],
    ["amount"],
    ["total"],
  );

  const creditCol = findCol(lower, ["crédito", "credito", "credit", "haber", "ingreso"]);
  const debitCol  = findCol(lower, ["débito",  "debito",  "debit",  "debe",  "egreso", "cargo"]);

  const operationCol = findCol(lower, ["operación", "operacion"]);

  const referenceCol = findCol(lower,
    ["número documento", "numero documento"],
    ["certificado"],
    ["referencia"],
  );

  return {
    dateCol:      dateCol      >= 0 ? dateCol      : 0,
    descCol:      descCol      >= 0 ? descCol      : 1,
    amountCol:    amountCol    >= 0 ? amountCol    : 2,
    creditCol:    creditCol    >= 0 ? creditCol    : undefined,
    debitCol:     debitCol     >= 0 ? debitCol     : undefined,
    operationCol: operationCol >= 0 ? operationCol : undefined,
    referenceCol: referenceCol >= 0 ? referenceCol : undefined,
  };
}

// ─── Header row detection ─────────────────────────────────────────────────────

const DATE_KW   = ["fecha", "date", "fec"];
const AMOUNT_KW = ["importe", "monto", "credito", "crédito", "debito", "débito", "amount", "haber", "debe"];

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const lower = rows[i].map((c) => String(c ?? "").toLowerCase().trim());
    const hasDate   = lower.some((h) => DATE_KW.some((k) => h.includes(k)));
    const hasAmount = lower.some((h) => AMOUNT_KW.some((k) => h.includes(k)));
    if (hasDate && hasAmount) return i;
  }
  return 0;
}

// ─── Row processor ────────────────────────────────────────────────────────────

function processRows(rows: unknown[][], headerRowIndex: number): ParseResult {
  const mapping = guessColumns(rows[headerRowIndex]);
  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [];
  let dataRowCount = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

    const date = parseDate(row[mapping.dateCol]);
    if (!date) continue; // silently skip metadata/footer/total rows

    dataRowCount++;

    const description = String(row[mapping.descCol] ?? "").trim() || "Sin descripción";

    let reference: string | undefined;
    if (mapping.referenceCol !== undefined) {
      const ref = String(row[mapping.referenceCol] ?? "").trim();
      if (ref && ref !== "0") reference = ref;
    }

    let amount: number | null = null;
    let type: "income" | "expense" = "expense";

    if (mapping.creditCol !== undefined && mapping.debitCol !== undefined) {
      // Split columns: Crédito / Débito (e.g. Banco Nación)
      const credit = parseAmount(row[mapping.creditCol]);
      const debit  = parseAmount(row[mapping.debitCol]);
      if (credit !== null && credit !== 0) {
        amount = Math.abs(credit);    // income: positive
        type = "income";
      } else if (debit !== null && debit !== 0) {
        amount = -Math.abs(debit);    // expense: negative
        type = "expense";
      }
    } else {
      const raw = parseAmount(row[mapping.amountCol]);
      if (raw !== null) {
        if (mapping.operationCol !== undefined) {
          // Superfondos: derive type from "Operación" column
          const op = String(row[mapping.operationCol] ?? "").toLowerCase();
          if (op.includes("rescate") || op.includes("retiro") || op.includes("cobro")) {
            amount = Math.abs(raw);   // income: positive
            type = "income";
          } else if (op.includes("invers") || op.includes("suscri") || op.includes("compra")) {
            amount = -Math.abs(raw);  // expense: negative
            type = "expense";
          } else {
            amount = raw;
            type = raw >= 0 ? "income" : "expense";
          }
        } else {
          // Sign of the raw value determines type
          amount = raw;
          type = raw >= 0 ? "income" : "expense";
        }
      }
    }

    if (amount === null || amount === 0 || isNaN(amount)) {
      warnings.push(`Fila ${i + 1}: monto no reconocido`);
      continue;
    }

    const category = detectCategory(description, type);
    transactions.push({ date, description, amount, type, category, reference });
  }

  return { transactions, warnings, totalRows: dataRowCount };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as unknown[][];
        if (rows.length < 2) {
          resolve({ transactions: [], warnings: ["Archivo vacío o sin datos"], totalRows: 0 });
          return;
        }
        const headerRow = findHeaderRow(rows);
        resolve(processRows(rows, headerRow));
      },
      error: (err) => {
        resolve({
          transactions: [],
          warnings: [`Error al parsear CSV: ${err.message}`],
          totalRows: 0,
        });
      },
    });
  });
}

// Read worksheet cells individually, preferring the formatted display string (w) over
// the raw numeric value (v) when the display looks like an Argentine/accounting amount.
// This is necessary for Santander XLS files where the internal v is scaled differently
// from the displayed amount (e.g. v=-54733 displayed as "(547,33)" = -547.33 pesos).
// For cells without such formatting (BBVA plain numbers, serial dates) we use v directly.
function buildRows(ws: XLSX.WorkSheet): unknown[][] {
  const ref = ws["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: unknown[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: unknown[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (!cell || cell.v === undefined) { row.push(""); continue; }

      if (cell.t === "n" && cell.w) {
        const w = cell.w.trim();
        // Use formatted string when it looks like an Argentine/accounting amount:
        // parentheses, commas, $ sign, or dot-thousands pattern (e.g. "200.000,00")
        if (/[(),]/.test(w) || /\d\.\d{3}/.test(w)) {
          row.push(w);
          continue;
        }
      }

      row.push(cell.v);
    }
    rows.push(row);
  }

  return rows;
}

export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = buildRows(worksheet);

        if (rows.length < 2) {
          resolve({ transactions: [], warnings: ["Archivo vacío o sin datos"], totalRows: 0 });
          return;
        }

        const headerRow = findHeaderRow(rows);
        resolve(processRows(rows, headerRow));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        resolve({
          transactions: [],
          warnings: [`Error al parsear Excel: ${msg}`],
          totalRows: 0,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseExcel(file);
  if (ext === "pdf") return parsePDF(file);
  return {
    transactions: [],
    warnings: ["Formato no soportado. Use CSV, Excel (.xlsx/.xls) o PDF"],
    totalRows: 0,
  };
}

// ─── PDF parser (loaded from CDN at runtime to avoid Vite/Rollup bundling issues) ──

const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build";

interface PdfItem { str: string; x: number; y: number; }

function isAmountToken(s: string): boolean {
  const t = s.replace(/^\$\s*/, "").trim();
  return /^\d{1,3}(\.\d{3})*,\d{2}$/.test(t) || /^\d{1,9},\d{2}$/.test(t);
}

function parseAmountToken(s: string): number | null {
  return parseAmount(s.replace(/^\$\s*/, "").trim());
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Extract counterparty name from a continuation row (line after the transaction date line)
function extractCounterparty(text: string): string | null {
  const t = text.trim();
  if (!t || /^[\d\s]+$/.test(t)) return null; // skip pure number rows

  // Credicoop: "20182723712−VAR−VICTOR HUGO,MARINELLA" (unicode minus U+2212 or ASCII -)
  const creMatch = t.match(/^\d{10,11}[−\-](VAR|FAC|REC|PAG)[−\-](.+)$/i);
  if (creMatch) return titleCase(creMatch[2].replace(/,/g, " ").trim());

  // Santander: "De raquel kwon / - var / 27253864953"  or  "A balanz capital valores / - inv / ..."
  const santMatch = t.match(/^(de|a)\s+(.+?)\s*\/\s*[-−]/i);
  if (santMatch) {
    const prep = santMatch[1].charAt(0).toUpperCase() + santMatch[1].slice(1);
    return `${prep} ${titleCase(santMatch[2].trim())}`;
  }

  // Credicoop service payments: "Ente: ARBA WEB"
  const enteMatch = t.match(/^ente:\s*(.+)$/i);
  if (enteMatch) return titleCase(enteMatch[1].trim());

  // Débitos automáticos: "TELECENTRO−0008296685" or "SEGUR.SOCIO SEG.VIDA−1717005442116501"
  // Name starts with a letter, ends with dash + reference number (6+ digits)
  const serviceMatch = t.match(/^([A-Za-záéíóúñÁÉÍÓÚÑ][\w\s\.\,\/]*?)[−\-]\d{6,}\s*$/);
  if (serviceMatch) return titleCase(serviceMatch[1].trim());

  return null;
}

export async function parsePDF(file: File): Promise<ParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjsLib: any;
  try {
    // Dynamic CDN import — bypasses Rollup entirely, loaded fresh per session
    pdfjsLib = await import(/* @vite-ignore */ `${PDFJS_CDN}/pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
    // Warm-up: verify the lib loaded correctly
    if (typeof pdfjsLib.getDocument !== "function") throw new Error("pdfjs API not available");
  } catch {
    return { transactions: [], warnings: ["No se pudo cargar el lector de PDF (requiere conexión)"], totalRows: 0 };
  }

  let arrayBuffer: ArrayBuffer;
  try { arrayBuffer = await file.arrayBuffer(); }
  catch { return { transactions: [], warnings: ["No se pudo leer el archivo PDF"], totalRows: 0 }; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any;
  try { pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise; }
  catch { return { transactions: [], warnings: ["No se pudo parsear el PDF — verificá que no esté protegido con contraseña"], totalRows: 0 }; }

  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [];

  // Column boundaries auto-detected from header row; fallback values cover both banks
  let debitCreditBound = 425; // x < this → debit; x > this → credit
  let creditSaldoBound = 510; // x > this → saldo (skip)
  let headerFound = false;

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

    // Group into rows by Y (tolerance ±3pt), sort top→bottom then left→right
    const yGroups = new Map<number, PdfItem[]>();
    for (const item of items) {
      let matched = false;
      for (const ky of yGroups.keys()) {
        if (Math.abs(ky - item.y) <= 3) { yGroups.get(ky)!.push(item); matched = true; break; }
      }
      if (!matched) yGroups.set(item.y, [item]);
    }
    const rows = [...yGroups.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => row.sort((a, b) => a.x - b.x));

    // Auto-detect column positions from header row (once per document)
    if (!headerFound) {
      for (const row of rows) {
        const deb = row.find(r => /^(déb?ito|debito)$/i.test(r.str));
        const cred = row.find(r => /^(créd?ito|credito)$/i.test(r.str));
        if (deb && cred && cred.x > deb.x) {
          debitCreditBound = (deb.x + cred.x) / 2;
          const sal = row.find(r => /^saldo$/i.test(r.str) && r.x > cred.x);
          if (sal) creditSaldoBound = (cred.x + sal.x) / 2;
          headerFound = true;
          break;
        }
      }
    }

    // Flag: stop parsing transactions once we hit a summary/detail section header
    let inSummarySection = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowText = row.map(r => r.str).join(" ");

      // Detect summary section headers (e.g. "TRANSFERENCIAS PESOS", "DEBITOS AUTOMATICOS",
      // "DETALLE DE TRANSFERENCIAS", "CHEQUES PAGADOS") — these repeat transactions already seen
      if (/transferencias\s+pesos|d[eé]bitos\s+autom[aá]ticos|cheques\s+pagados|detalle\s+de\s+(transferencias|d[eé]bitos|cheques)|totales\s+\d/i.test(rowText)) {
        inSummarySection = true;
      }
      if (inSummarySection) continue;

      const dateItem = row.find(r => /^\d{1,2}\/\d{2}\/\d{2,4}$/.test(r.str));
      if (!dateItem) continue;
      const date = parseDate(dateItem.str);
      if (!date) continue;

      const amtItems = row.filter(r => isAmountToken(r.str) && r.x <= creditSaldoBound);
      if (amtItems.length === 0) continue;

      const firstAmtX = Math.min(...amtItems.map(r => r.x));
      const desc = row
        .filter(r => r.x > dateItem.x + 2 && r.x < firstAmtX - 2 && !isAmountToken(r.str) && !/^\d{4,8}$/.test(r.str))
        .map(r => r.str).join(" ").trim();

      if (!desc || /saldo|inicial|anterior|viene de|continua/i.test(desc)) continue;

      const amtItem = amtItems[0];
      const raw = parseAmountToken(amtItem.str);
      if (raw === null || raw === 0) continue;
      const absAmt = Math.abs(raw);

      const isCredit = amtItem.x > debitCreditBound;
      const type: "income" | "expense" = isCredit ? "income" : "expense";
      const amount = type === "income" ? absAmt : -absAmt;

      // Look ahead up to 3 continuation rows for counterparty name
      let counterparty = "";
      for (let j = i + 1; j < Math.min(i + 4, rows.length) && !counterparty; j++) {
        const next = rows[j];
        if (next.some(r => /^\d{1,2}\/\d{2}\/\d{2,4}$/.test(r.str))) break;
        const cp = extractCounterparty(next.map(r => r.str).join(" "));
        if (cp) counterparty = cp;
      }

      const fullDesc = counterparty ? `${desc} − ${counterparty}` : desc;
      transactions.push({ date, description: fullDesc, amount, type, category: detectCategory(fullDesc, type) });
    }
  }

  return { transactions, warnings, totalRows: transactions.length };
}
