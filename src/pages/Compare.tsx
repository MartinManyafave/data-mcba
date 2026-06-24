import { useState, useMemo, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import {
  FileText, Loader2, X,
  ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { parseFile, type ParsedTransaction } from "@/lib/fileParser";
import { parseDospPDF, type DospEntry } from "@/lib/dospParser";
import {
  reconcile,
  type ReconcileResult, type DayGroup, type MatchedPair,
} from "@/lib/reconcile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Side state ────────────────────────────────────────────────────────────────

interface SideState {
  file: File | null;
  parsing: boolean;
  transactions: ParsedTransaction[] | null;
  entries: DospEntry[] | null;
  warnings: string[];
  error: string | null;
}
const empty = (): SideState => ({
  file: null, parsing: false, transactions: null, entries: null, warnings: [], error: null,
});

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Compare() {
  const [bank, setBank] = useState<SideState>(empty());
  const [dosp, setDosp] = useState<SideState>(empty());
  const [dayOpen, setDayOpen] = useState(true);
  const [txOpen, setTxOpen] = useState(false);
  const [txTab, setTxTab] = useState<"all" | "diff">("all");

  const onDropBank = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return;
    setBank({ ...empty(), file: f, parsing: true });
    const r = await parseFile(f);
    setBank({
      file: f, parsing: false,
      transactions: r.transactions, entries: null,
      warnings: r.warnings,
      error: r.transactions.length === 0 ? "No se encontraron transacciones" : null,
    });
  }, []);

  const onDropDosp = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return;
    setDosp({ ...empty(), file: f, parsing: true });
    const r = await parseDospPDF(f);
    setDosp({
      file: f, parsing: false,
      transactions: null, entries: r.entries,
      warnings: r.warnings,
      error: r.entries.length === 0 ? "No se encontraron movimientos" : null,
    });
  }, []);

  const bankDrop = useDropzone({
    onDrop: onDropBank, accept: { "application/pdf": [".pdf"] }, maxFiles: 1, disabled: bank.parsing,
  });
  const dospDrop = useDropzone({
    onDrop: onDropDosp, accept: { "application/pdf": [".pdf"] }, maxFiles: 1, disabled: dosp.parsing,
  });

  const result = useMemo<ReconcileResult | null>(() => {
    if (!bank.transactions || !dosp.entries) return null;
    return reconcile(bank.transactions, dosp.entries);
  }, [bank.transactions, dosp.entries]);

  const diffIncome  = result ? result.totalBankIncome  - result.totalDospIncome  : 0;
  const diffExpense = result ? result.totalBankExpense - result.totalDospExpense : 0;

  const allPairs = result?.dayGroups.flatMap((d) => d.pairs) ?? [];
  const displayPairs = txTab === "diff"
    ? allPairs.filter((p) => p.status !== "matched")
    : allPairs;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Comparar Extractos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cargá el extracto bancario y el resumen DOSP para verificar que coincidan.
        </p>
      </div>

      {/* Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideCard
          title="Extracto Bancario"
          subtitle="PDF del banco (Santander, Credicoop, etc.)"
          state={bank}
          dz={bankDrop}
          onClear={() => setBank(empty())}
          count={bank.transactions?.length ?? 0}
          countLabel="transacciones"
        />
        <SideCard
          title="Resumen DOSP"
          subtitle="Listado de Cuentas Corrientes Bancos"
          state={dosp}
          dz={dospDrop}
          onClear={() => setDosp(empty())}
          count={dosp.entries?.length ?? 0}
          countLabel="movimientos"
        />
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Global summary */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resumen global
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-white/[0.06]">
                    <th className="text-left pb-2 font-medium w-24" />
                    <th className="text-right pb-2 font-medium">Banco</th>
                    <th className="text-right pb-2 font-medium">DOSP</th>
                    <th className="text-right pb-2 font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 text-muted-foreground">Ingresos</td>
                    <td className="py-2 text-right font-medium text-success tabular-nums">
                      {formatCurrency(result.totalBankIncome)}
                    </td>
                    <td className="py-2 text-right font-medium text-success tabular-nums">
                      {formatCurrency(result.totalDospIncome)}
                    </td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${diffIncome === 0 ? "text-success" : "text-destructive"}`}>
                      {diffIncome === 0 ? "✓ $0" : formatCurrency(Math.abs(diffIncome))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground">Egresos</td>
                    <td className="py-2 text-right font-medium text-destructive tabular-nums">
                      {formatCurrency(result.totalBankExpense)}
                    </td>
                    <td className="py-2 text-right font-medium text-destructive tabular-nums">
                      {formatCurrency(result.totalDospExpense)}
                    </td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${diffExpense === 0 ? "text-success" : "text-destructive"}`}>
                      {diffExpense === 0 ? "✓ $0" : formatCurrency(Math.abs(diffExpense))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Day summary */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Resumen por día
                </p>
                <button
                  onClick={() => setDayOpen((o) => !o)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {dayOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </CardHeader>
            {dayOpen && (
              <CardContent className="px-4 pb-4 pt-0 overflow-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-muted-foreground border-b border-white/[0.06]">
                      <th className="text-left pb-2 font-medium pr-3">Fecha</th>
                      <th className="text-right pb-2 font-medium pr-2">Ingr. Banco</th>
                      <th className="text-right pb-2 font-medium pr-2">Ingr. DOSP</th>
                      <th className="text-right pb-2 font-medium pr-3">Δ Ingr.</th>
                      <th className="text-right pb-2 font-medium pr-2">Egr. Banco</th>
                      <th className="text-right pb-2 font-medium pr-2">Egr. DOSP</th>
                      <th className="text-right pb-2 font-medium pr-3">Δ Egr.</th>
                      <th className="text-center pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dayGroups.map((day) => (
                      <DayRow key={day.date} day={day} />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>

          {/* Transaction detail */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Detalle por transacción
                </p>
                <button
                  onClick={() => setTxOpen((o) => !o)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {txOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </CardHeader>
            {txOpen && (
              <CardContent className="px-4 pb-4 pt-0">
                {/* Tab pills */}
                <div className="flex gap-2 mb-3">
                  {(["all", "diff"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTxTab(t)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        txTab === t
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "border-white/[0.08] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "all" ? "Todas" : "Solo diferencias"}
                    </button>
                  ))}
                </div>
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-white/[0.06]">
                        <th className="w-6 pb-2" />
                        <th className="text-left pb-2 font-medium">Banco</th>
                        <th className="text-left pb-2 font-medium">DOSP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPairs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-foreground">
                            Sin diferencias — todo cuadra ✓
                          </td>
                        </tr>
                      ) : (
                        displayPairs.map((pair) => (
                          <PairRow
                            key={`${pair.status}|${pair.bank?.date ?? ""}|${pair.bank?.amount ?? ""}|${pair.dosp?.date ?? ""}|${pair.dosp?.amount ?? ""}`}
                            pair={pair}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SideCard({
  title, subtitle, state, dz, onClear, count, countLabel,
}: {
  title: string;
  subtitle: string;
  state: SideState;
  dz: ReturnType<typeof useDropzone>;
  onClear: () => void;
  count: number;
  countLabel: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = dz;

  if (state.file && !state.parsing) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{state.file.name}</p>
              {state.error ? (
                <p className="text-xs text-destructive">{state.error}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {count} {countLabel}
                </p>
              )}
              {state.warnings.length > 0 && (
                <p className="text-xs text-warning">
                  {state.warnings.length} advertencia{state.warnings.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={onClear}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      <div
        {...getRootProps()}
        className={`rounded-xl border border-dashed p-8 text-center cursor-pointer transition-all
          ${isDragActive ? "border-primary bg-primary/[0.06]" : "border-white/[0.08] hover:border-primary/30 hover:bg-white/[0.02]"}
          ${state.parsing ? "opacity-60 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        {state.parsing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Procesando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileText className={`w-6 h-6 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            <p className="text-xs text-muted-foreground">
              {isDragActive ? "Soltá el archivo" : "Arrastrá o hacé clic · solo PDF"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DayRow({ day }: { day: DayGroup }) {
  const ok = day.pairs.every((p) => p.status === "matched");
  const dI = day.bankIncome - day.dospIncome;
  const dE = day.bankExpense - day.dospExpense;
  return (
    <tr className="border-b border-white/[0.03]">
      <td className="py-1.5 pr-3 tabular-nums">{formatDate(day.date)}</td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-success">
        {day.bankIncome > 0 ? formatCurrency(day.bankIncome) : "—"}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-success">
        {day.dospIncome > 0 ? formatCurrency(day.dospIncome) : "—"}
      </td>
      <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${dI === 0 ? "text-muted-foreground" : "text-destructive"}`}>
        {dI === 0 ? "—" : formatCurrency(Math.abs(dI))}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-destructive">
        {day.bankExpense > 0 ? formatCurrency(day.bankExpense) : "—"}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-destructive">
        {day.dospExpense > 0 ? formatCurrency(day.dospExpense) : "—"}
      </td>
      <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${dE === 0 ? "text-muted-foreground" : "text-destructive"}`}>
        {dE === 0 ? "—" : formatCurrency(Math.abs(dE))}
      </td>
      <td className="py-1.5 text-center">
        <Badge
          variant="outline"
          className={`text-[10px] ${ok ? "text-success border-success/30" : "text-warning border-warning/30"}`}
        >
          {ok ? "✓ Cuadra" : "⚠ Dif."}
        </Badge>
      </td>
    </tr>
  );
}

function PairRow({ pair }: { pair: MatchedPair }) {
  const icon =
    pair.status === "matched" ? "✅" :
    pair.status === "bank_only" ? "🔴" : "⚠️";

  const bankCell = pair.bank ? (
    <span className="flex items-center gap-1 min-w-0">
      {pair.bank.type === "income"
        ? <ArrowUpRight className="w-3 h-3 text-success flex-shrink-0" />
        : <ArrowDownRight className="w-3 h-3 text-destructive flex-shrink-0" />}
      <span className={`font-medium tabular-nums flex-shrink-0 ${pair.bank.type === "income" ? "text-success" : "text-destructive"}`}>
        {formatCurrency(Math.abs(pair.bank.amount))}
      </span>
      <span className="text-muted-foreground truncate">
        {formatDate(pair.bank.date)} · {pair.bank.description}
      </span>
    </span>
  ) : <span className="text-muted-foreground/40">—</span>;

  const dospCell = pair.dosp ? (
    <span className="flex items-center gap-1 min-w-0">
      {pair.dosp.type === "income"
        ? <ArrowUpRight className="w-3 h-3 text-success flex-shrink-0" />
        : <ArrowDownRight className="w-3 h-3 text-destructive flex-shrink-0" />}
      <span className={`font-medium tabular-nums flex-shrink-0 ${pair.dosp.type === "income" ? "text-success" : "text-destructive"}`}>
        {formatCurrency(Math.abs(pair.dosp.amount))}
      </span>
      <span className="text-muted-foreground truncate">
        {formatDate(pair.dosp.date)} · {pair.dosp.description}
      </span>
    </span>
  ) : <span className="text-muted-foreground/40">—</span>;

  return (
    <tr className="border-b border-white/[0.03]">
      <td className="py-1.5 text-center">{icon}</td>
      <td className="py-1.5 pr-2 max-w-[240px]">{bankCell}</td>
      <td className="py-1.5 max-w-[240px]">{dospCell}</td>
    </tr>
  );
}
