import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload as UploadIcon, FileText, CheckCircle2, AlertTriangle,
  X, Loader2, ArrowUpRight, ArrowDownRight, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseFile, type ParsedTransaction } from "@/lib/fileParser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const FILE_TYPES = [
  { value: "bank_statement", label: "Extracto Bancario" },
  { value: "transfer", label: "Transferencias" },
  { value: "current_account", label: "Cuenta Corriente" },
  { value: "comanda", label: "Comanda" },
  { value: "other", label: "Otro" },
];

type UploadStep = "idle" | "parsing" | "preview" | "saving" | "done";

interface FileEntry {
  id: string;
  file: File;
  fileType: string;
  status: "parsing" | "ready" | "error";
  transactions: ParsedTransaction[];
  warnings: string[];
  totalRows: number;
  expanded: boolean;
}

export default function Upload() {
  const { user } = useAuth();
  const [step, setStep] = useState<UploadStep>("idle");
  const [globalFileType, setGlobalFileType] = useState("bank_statement");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      setStep("parsing");

      const newEntries: FileEntry[] = accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        fileType: globalFileType,
        status: "parsing",
        transactions: [],
        warnings: [],
        totalRows: 0,
        expanded: false,
      }));

      setEntries((prev) => [...prev, ...newEntries]);

      // Parse all files in parallel
      const results = await Promise.all(accepted.map((f) => parseFile(f)));

      setEntries((prev) =>
        prev.map((entry) => {
          const idx = newEntries.findIndex((n) => n.id === entry.id);
          if (idx === -1) return entry;
          const r = results[idx];
          return {
            ...entry,
            status: "ready",
            transactions: r.transactions,
            warnings: r.warnings,
            totalRows: r.totalRows,
          };
        })
      );

      setStep("preview");
    },
    [globalFileType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    disabled: step === "parsing" || step === "saving",
  });

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (next.length === 0) setStep("idle");
      return next;
    });
  };

  const toggleExpand = (id: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)));

  const updateFileType = (id: string, fileType: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, fileType } : e)));

  const handleSave = async () => {
    if (!user || entries.length === 0) return;
    const readyEntries = entries.filter((e) => e.status === "ready" && e.transactions.length > 0);
    if (readyEntries.length === 0) return;

    setStep("saving");
    let total = 0;

    try {
      for (const entry of readyEntries) {
        const { data: upload, error: upErr } = await supabase
          .from("file_uploads")
          .insert({
            user_id: user.id,
            file_name: entry.file.name,
            file_type: entry.fileType,
            file_size: entry.file.size,
            status: "processed",
            transaction_count: entry.transactions.length,
          })
          .select()
          .single();

        if (upErr) throw upErr;

        const txs = entry.transactions.map((t) => ({
          user_id: user.id,
          upload_id: upload.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: entry.fileType,
          reference: t.reference ?? null,
        }));

        const CHUNK = 100;
        for (let i = 0; i < txs.length; i += CHUNK) {
          const { error } = await supabase.from("transactions").insert(txs.slice(i, i + CHUNK));
          if (error) throw error;
        }

        total += entry.transactions.length;
      }

      setSavedCount(total);
      setStep("done");
      toast.success(`${total} transacciones importadas correctamente`);
    } catch (err: unknown) {
      setStep("preview");
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const reset = () => {
    setStep("idle");
    setEntries([]);
    setSavedCount(0);
  };

  const totalTx = entries.reduce((s, e) => s + e.transactions.length, 0);
  const totalIncome = entries.flatMap((e) => e.transactions).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = entries.flatMap((e) => e.transactions).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Cargar Archivo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importá uno o varios extractos bancarios, transferencias o comandas.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Done ── */}
        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-10 text-center">
              <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">¡Importación exitosa!</h2>
              <p className="text-muted-foreground mb-1">
                <span className="text-foreground font-semibold">{savedCount}</span> transacciones importadas
              </p>
              <p className="text-sm text-muted-foreground mb-6">Los datos ya están disponibles en el Dashboard e Historial.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={reset} variant="outline">Cargar más archivos</Button>
                <Button asChild><a href="/dashboard">Ver Dashboard</a></Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Preview / Saving ── */}
        {(step === "preview" || step === "saving") && entries.length > 0 && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Global summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {entries.length} archivo{entries.length > 1 ? "s" : ""} seleccionado{entries.length > 1 ? "s" : ""}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground h-7 px-2 text-xs">
                    <X className="w-3.5 h-3.5 mr-1" /> Limpiar todo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Archivos", value: entries.length },
                    { label: "Transacciones", value: totalTx, color: "text-primary" },
                    { label: "Ingresos", value: formatCurrency(totalIncome), color: "text-success" },
                    { label: "Egresos", value: formatCurrency(totalExpense), color: "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-base font-bold mt-0.5 ${s.color ?? ""}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={reset} disabled={step === "saving"}>
                    <Trash2 className="w-4 h-4 mr-1.5" />Descartar todo
                  </Button>
                  <Button onClick={handleSave} disabled={step === "saving" || totalTx === 0}>
                    {step === "saving"
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Guardando...</>
                      : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Confirmar importación</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Per-file cards */}
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  {/* File header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.file.name}</p>
                      {entry.status === "ready" && (
                        <p className="text-xs text-muted-foreground">
                          {entry.transactions.length} transacciones
                          {entry.warnings.length > 0 && (
                            <span className="text-warning ml-2">· {entry.warnings.length} advertencia{entry.warnings.length > 1 ? "s" : ""}</span>
                          )}
                        </p>
                      )}
                      {entry.status === "parsing" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Procesando...
                        </p>
                      )}
                    </div>

                    {/* File type selector per file */}
                    <Select
                      value={entry.fileType}
                      onValueChange={(v) => updateFileType(entry.id, v)}
                      disabled={step === "saving"}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs hidden sm:flex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {entry.status === "ready" && entry.transactions.length > 0 && (
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {entry.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => removeEntry(entry.id)}
                      disabled={step === "saving"}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Warnings */}
                  {entry.status === "ready" && entry.warnings.length > 0 && (
                    <div className="mx-4 mb-3 rounded-lg bg-warning/10 border border-warning/20 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        <span className="text-xs font-medium text-warning">{entry.warnings.length} advertencia{entry.warnings.length > 1 ? "s" : ""}</span>
                      </div>
                      {entry.warnings.slice(0, 3).map((w, i) => (
                        <p key={i} className="text-xs text-warning/80">{w}</p>
                      ))}
                      {entry.warnings.length > 3 && (
                        <p className="text-xs text-warning/60">... y {entry.warnings.length - 3} más</p>
                      )}
                    </div>
                  )}

                  {/* Expandable preview table */}
                  <AnimatePresence>
                    {entry.expanded && entry.transactions.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/[0.06] overflow-auto max-h-56">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.transactions.slice(0, 20).map((tx, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                                  <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                                  <TableCell>
                                    <Badge variant={tx.type === "income" ? "success" : "destructive"} className="text-[10px]">
                                      {tx.type === "income" ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                      {tx.type === "income" ? "Ingreso" : "Egreso"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={`text-right text-sm font-medium ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {entry.transactions.length > 20 && (
                            <p className="text-center text-xs text-muted-foreground py-2">
                              Mostrando 20 de {entry.transactions.length} transacciones
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>

            {/* Add more files drop zone */}
            <div
              {...getRootProps()}
              className={`rounded-xl border border-dashed p-6 text-center cursor-pointer transition-all
                ${isDragActive ? "border-primary bg-primary/[0.06]" : "border-white/[0.08] hover:border-primary/30 hover:bg-white/[0.02]"}
                ${step === "saving" ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <UploadIcon className="w-4 h-4" />
                <span className="text-sm">{isDragActive ? "Soltá los archivos" : "Agregar más archivos"}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Idle / Parsing ── */}
        {(step === "idle" || step === "parsing") && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Global file type */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-0.5">Tipo de archivo</p>
                  <p className="text-xs text-muted-foreground">Se aplica a todos los archivos de esta carga</p>
                </div>
                <Select value={globalFileType} onValueChange={setGlobalFileType}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all
                ${isDragActive ? "border-primary bg-primary/[0.06] scale-[1.01]" : "border-white/10 hover:border-primary/40 hover:bg-white/[0.02]"}
                ${step === "parsing" ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              <input {...getInputProps()} />
              {step === "parsing" ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Procesando archivos...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragActive ? "bg-primary/20 border-primary/30" : "bg-white/[0.04] border-white/[0.08]"} border`}>
                    <UploadIcon className={`w-7 h-7 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium mb-1">
                      {isDragActive ? "Soltá los archivos acá" : "Arrastrá o hacé clic para cargar"}
                    </p>
                    <p className="text-sm text-muted-foreground">Podés subir varios archivos a la vez · CSV, XLSX o XLS</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hints */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Formatos soportados</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Extractos con columnas Fecha, Descripción, Monto",
                  "Extractos con columnas Debe / Haber separadas",
                  "Importes con formato (1.234,56) para débitos",
                  "Múltiples archivos en una sola carga",
                ].map((hint) => (
                  <div key={hint} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                    {hint}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
