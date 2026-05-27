import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  reference?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  warnings: string[];
  totalRows: number;
}

function detectDateFormat(value: string): string | null {
  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [d, m, y] = value.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) {
    const [d, m, y] = value.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Excel serial date
  const serial = parseFloat(value);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const date = XLSX.SSF.parse_date_code(serial);
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  return null;
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  // Remove currency symbols, spaces
  const cleaned = value.replace(/[$ \s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function guessColumnMapping(headers: string[]): {
  dateCol: number;
  descCol: number;
  amountCol: number;
  creditCol?: number;
  debitCol?: number;
} {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const dateCol = lower.findIndex((h) =>
    ["fecha", "date", "fec", "dia", "día"].some((k) => h.includes(k))
  );
  const descCol = lower.findIndex((h) =>
    ["concepto", "descripcion", "descripción", "detalle", "description", "motivo", "glosa"].some(
      (k) => h.includes(k)
    )
  );
  const amountCol = lower.findIndex((h) =>
    ["importe", "monto", "amount", "valor", "total"].some((k) => h.includes(k))
  );
  const creditCol = lower.findIndex((h) =>
    ["credito", "crédito", "credit", "haber", "ingreso"].some((k) => h.includes(k))
  );
  const debitCol = lower.findIndex((h) =>
    ["debito", "débito", "debit", "debe", "egreso", "cargo"].some((k) => h.includes(k))
  );

  return {
    dateCol: dateCol >= 0 ? dateCol : 0,
    descCol: descCol >= 0 ? descCol : 1,
    amountCol: amountCol >= 0 ? amountCol : 2,
    creditCol: creditCol >= 0 ? creditCol : undefined,
    debitCol: debitCol >= 0 ? debitCol : undefined,
  };
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          resolve({ transactions: [], warnings: ["Archivo vacío o sin datos"], totalRows: 0 });
          return;
        }

        const headers = rows[0];
        const mapping = guessColumnMapping(headers);
        const transactions: ParsedTransaction[] = [];
        const warnings: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawDate = row[mapping.dateCol] ?? "";
          const date = detectDateFormat(rawDate.trim());

          if (!date) {
            warnings.push(`Fila ${i + 1}: fecha no reconocida ("${rawDate}")`);
            continue;
          }

          const description = row[mapping.descCol]?.trim() || "Sin descripción";

          let amount: number | null = null;
          let type: "income" | "expense" = "expense";

          if (mapping.creditCol !== undefined && mapping.debitCol !== undefined) {
            const credit = parseAmount(row[mapping.creditCol] ?? "");
            const debit = parseAmount(row[mapping.debitCol] ?? "");
            if (credit && credit > 0) {
              amount = credit;
              type = "income";
            } else if (debit && debit > 0) {
              amount = debit;
              type = "expense";
            }
          } else {
            const raw = parseAmount(row[mapping.amountCol] ?? "");
            if (raw !== null) {
              amount = Math.abs(raw);
              type = raw >= 0 ? "income" : "expense";
            }
          }

          if (amount === null || amount === 0) {
            warnings.push(`Fila ${i + 1}: monto no reconocido`);
            continue;
          }

          transactions.push({ date, description, amount, type });
        }

        resolve({ transactions, warnings, totalRows: rows.length - 1 });
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
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          dateNF: "YYYY-MM-DD",
        });

        if (rows.length < 2) {
          resolve({ transactions: [], warnings: ["Archivo vacío o sin datos"], totalRows: 0 });
          return;
        }

        const headers = rows[0];
        const mapping = guessColumnMapping(headers);
        const transactions: ParsedTransaction[] = [];
        const warnings: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawDate = row[mapping.dateCol] ?? "";
          const date = detectDateFormat(rawDate.toString().trim());

          if (!date) {
            warnings.push(`Fila ${i + 1}: fecha no reconocida ("${rawDate}")`);
            continue;
          }

          const description = row[mapping.descCol]?.toString().trim() || "Sin descripción";
          let amount: number | null = null;
          let type: "income" | "expense" = "expense";

          if (mapping.creditCol !== undefined && mapping.debitCol !== undefined) {
            const credit = parseAmount(row[mapping.creditCol]?.toString() ?? "");
            const debit = parseAmount(row[mapping.debitCol]?.toString() ?? "");
            if (credit && credit > 0) {
              amount = credit;
              type = "income";
            } else if (debit && debit > 0) {
              amount = debit;
              type = "expense";
            }
          } else {
            const raw = parseAmount(row[mapping.amountCol]?.toString() ?? "");
            if (raw !== null) {
              amount = Math.abs(raw);
              type = raw >= 0 ? "income" : "expense";
            }
          }

          if (amount === null || amount === 0) continue;

          transactions.push({ date, description, amount, type });
        }

        resolve({ transactions, warnings, totalRows: rows.length - 1 });
      } catch (err: any) {
        resolve({
          transactions: [],
          warnings: [`Error al parsear Excel: ${err.message}`],
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
