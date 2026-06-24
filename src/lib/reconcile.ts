import type { ParsedTransaction } from "./fileParser";
import type { DospEntry } from "./dospParser";

export type MatchStatus = "matched" | "bank_only" | "dosp_only";

export interface MatchedPair {
  status: MatchStatus;
  bank?: ParsedTransaction;
  dosp?: DospEntry;
}

export interface DayGroup {
  date: string;
  pairs: MatchedPair[];
  bankIncome: number;
  bankExpense: number;
  dospIncome: number;
  dospExpense: number;
}

export interface ReconcileResult {
  dayGroups: DayGroup[];
  totalBankIncome: number;
  totalBankExpense: number;
  totalDospIncome: number;
  totalDospExpense: number;
}

export function reconcile(
  bankTxs: ParsedTransaction[],
  dospEntries: DospEntry[]
): ReconcileResult {
  const allDates = new Set([
    ...bankTxs.map((t) => t.date),
    ...dospEntries.map((e) => e.date),
  ]);

  const dayGroups: DayGroup[] = [];

  for (const date of [...allDates].sort()) {
    const bankOnDate = bankTxs.filter((t) => t.date === date);
    const dospOnDate = dospEntries.filter((e) => e.date === date);

    const bankIncomeTxs = bankOnDate.filter((t) => t.type === "income");
    const bankExpenseTxs = bankOnDate.filter((t) => t.type === "expense");
    const dospIncomeEntries = dospOnDate.filter((e) => e.type === "income");
    const dospExpenseEntries = dospOnDate.filter((e) => e.type === "expense");

    const pairs: MatchedPair[] = [
      ...matchSide(bankIncomeTxs, dospIncomeEntries),
      ...matchSide(bankExpenseTxs, dospExpenseEntries),
    ];

    dayGroups.push({
      date,
      pairs,
      bankIncome: bankIncomeTxs.reduce((s, t) => s + Math.abs(t.amount), 0),
      bankExpense: bankExpenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0),
      dospIncome: dospIncomeEntries.reduce((s, e) => s + Math.abs(e.amount), 0),
      dospExpense: dospExpenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0),
    });
  }

  return {
    dayGroups,
    totalBankIncome: dayGroups.reduce((s, d) => s + d.bankIncome, 0),
    totalBankExpense: dayGroups.reduce((s, d) => s + d.bankExpense, 0),
    totalDospIncome: dayGroups.reduce((s, d) => s + d.dospIncome, 0),
    totalDospExpense: dayGroups.reduce((s, d) => s + d.dospExpense, 0),
  };
}

function matchSide(
  bankTxs: ParsedTransaction[],
  dospEntries: DospEntry[]
): MatchedPair[] {
  const matchedBankIdx = new Set<number>();
  const pairs: MatchedPair[] = [];
  const dospUnmatched: DospEntry[] = [];

  for (const dosp of dospEntries) {
    const dospAmt = Math.abs(dosp.amount);
    const idx = bankTxs.findIndex(
      (b, i) => !matchedBankIdx.has(i) && Math.abs(b.amount) === dospAmt
    );
    if (idx !== -1) {
      pairs.push({ status: "matched", bank: bankTxs[idx], dosp });
      matchedBankIdx.add(idx);
    } else {
      dospUnmatched.push(dosp);
    }
  }

  bankTxs.forEach((b, i) => {
    if (!matchedBankIdx.has(i)) pairs.push({ status: "bank_only", bank: b });
  });

  for (const d of dospUnmatched) {
    pairs.push({ status: "dosp_only", dosp: d });
  }

  return pairs;
}
