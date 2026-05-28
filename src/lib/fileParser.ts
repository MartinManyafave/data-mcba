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

function parseAmount(value: unknown): number | null {
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
      // Debit values are stored as negative numbers — use Math.abs
      const credit = parseAmount(row[mapping.creditCol]);
      const debit  = parseAmount(row[mapping.debitCol]);
      if (credit !== null && credit !== 0) {
        amount = Math.abs(credit);
        type = "income";
      } else if (debit !== null && debit !== 0) {
        amount = Math.abs(debit);
        type = "expense";
      }
    } else {
      const raw = parseAmount(row[mapping.amountCol]);
      if (raw !== null) {
        amount = Math.abs(raw);
        if (mapping.operationCol !== undefined) {
          // Superfondos: derive type from "Operación" column
          const op = String(row[mapping.operationCol] ?? "").toLowerCase();
          if (op.includes("rescate") || op.includes("retiro") || op.includes("cobro")) {
            type = "income";   // fund redemption = money back to account
          } else if (op.includes("invers") || op.includes("suscri") || op.includes("compra")) {
            type = "expense";  // fund investment = money out of account
          } else {
            type = raw >= 0 ? "income" : "expense";
          }
        } else {
          type = raw >= 0 ? "income" : "expense";
        }
      }
    }

    if (amount === null || amount === 0) {
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

export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // raw: true preserves actual cell values (numbers as numbers, not reformatted strings)
        // This avoids XLSX misformatting amounts like -54733 → "(547,33)"
        const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: "",
        });

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
  return {
    transactions: [],
    warnings: ["Formato no soportado. Use CSV o Excel (.xlsx/.xls)"],
    totalRows: 0,
  };
}
