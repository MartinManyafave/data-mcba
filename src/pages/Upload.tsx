import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload as UploadIcon, FileText, CheckCircle2, AlertTriangle,
  X, Loader2, ArrowUpRight, ArrowDownRight, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseFile, type ParsedTransaction } from "@/lib/fileParser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, getCategoryLabel } from "@/lib/utils";
import { toast } from "sonner";

const FILE_TYPES = [
  { value: "bank_statement", label: "Extracto Bancario" },
  { value: "transfer", label: "Transferencias" },
  { value: "current_account", label: "Cuenta Corriente" },
  { value: "comanda", label: "Comanda" },
  { value: "other", label: "Otro" },
];

type UploadStep = "idle" | "parsing" | "preview" | "saving" | "done";

interface ParsePreview {
  file: File;
  fileType: string;
  transactions: ParsedTransaction[];
  warnings: string[];
  totalRows: number;
}

export default function Upload() {
  const { user } = useAuth();
  const [step, setStep] = useState<UploadStep>("idle");
  const [fileType, setFileType] = useState("bank_statement");
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;

      setStep("parsing");
      const result = await parseFile(file);
      setStep("preview");
      setPreview({
        file,
        fileType,
        transactions: result.transactions,
        warnings: result.warnings,
        totalRows: result.totalRows,
      });

      if (result.transactions.length === 0) {
        toast.warning("No se encontraron transacciones en el archivo.");
      }
    },
    [fileType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: step === "parsing" || step === "saving",
  });

  const handleSave = async () => {
    if (!preview || !user) return;
    setStep("saving");

    try {
      // Save upload record
      const { data: upload, error: upErr } = await supabase
        .from("file_uploads")
        .insert({
          user_id: user.id,
          file_name: preview.file.name,
          file_type: preview.fileType,
          file_size: preview.file.size,
          status: "processed",
          transaction_count: preview.transactions.length,
        })
        .select()
        .single();

      if (upErr) throw upErr;

      // Batch insert transactions (chunks of 100)
      const txs = preview.transactions.map((t) => ({
        user_id: user.id,
        upload_id: upload.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: preview.fileType,
        reference: t.reference ?? null,
      }));

      const CHUNK = 100;
      for (let i = 0; i < txs.length; i += CHUNK) {
        const chunk = txs.slice(i, i + CHUNK);
        const { error: txErr } = await supabase.from("transactions").insert(chunk);
        if (txErr) throw txErr;
      }

      setSavedCount(preview.transactions.length);
      setStep("done");
      toast.success(`${preview.transactions.length} transacciones importadas correctamente`);
    } catch (err: any) {
      setStep("preview");
      toast.error(`Error al guardar: ${err.message}`);
    }
  };

  const reset = () => {
    setStep("idle");
    setPreview(null);
    setSavedCount(0);
  };

  const totalIncome = preview?.transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalExpense = preview?.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Cargar Archivo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importá extractos bancarios, transferencias o comandas en formato CSV o Excel.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Done state */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-10 text-center">
              <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">¡Importación exitosa!</h2>
              <p className="text-muted-foreground mb-1">
                <span className="text-foreground font-semibold">{savedCount}</span> transacciones importadas
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Los datos ya están disponibles en el Dashboard e Historial.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={reset} variant="outline">Cargar otro archivo</Button>
                <Button asChild>
                  <a href="/dashboard">Ver Dashboard</a>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Preview state */}
        {(step === "preview" || step === "saving") && preview && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {preview.file.name}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={reset} className="w-7 h-7">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Total filas", value: preview.totalRows, color: "" },
                    { label: "Importadas", value: preview.transactions.length, color: "text-primary" },
                    { label: "Ingresos", value: formatCurrency(totalIncome), color: "text-success" },
                    { label: "Egresos", value: formatCurrency(totalExpense), color: "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-base font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {preview.warnings.length > 0 && (
                  <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium text-warning">
                        {preview.warnings.length} advertencia{preview.warnings.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {preview.warnings.slice(0, 5).map((w, i) => (
                        <li key={i} className="text-xs text-warning/80">{w}</li>
                      ))}
                      {preview.warnings.length > 5 && (
                        <li className="text-xs text-warning/60">... y {preview.warnings.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={reset} disabled={step === "saving"}>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Descartar
                  </Button>
                  <Button onClick={handleSave} disabled={step === "saving" || preview.transactions.length === 0}>
                    {step === "saving" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Confirmar importación
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview table */}
            {preview.transactions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Vista previa — primeras {Math.min(preview.transactions.length, 20)} transacciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-72">
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
                        {preview.transactions.slice(0, 20).map((tx, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(tx.date)}</TableCell>
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
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Idle / parsing */}
        {(step === "idle" || step === "parsing") && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* File type selector */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-0.5">Tipo de archivo</p>
                  <p className="text-xs text-muted-foreground">Seleccioná la categoría antes de cargar</p>
                </div>
                <Select value={fileType} onValueChange={setFileType}>
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
              className={`
                relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all
                ${isDragActive
                  ? "border-primary bg-primary/[0.06] scale-[1.01]"
                  : "border-white/10 hover:border-primary/40 hover:bg-white/[0.02]"
                }
                ${step === "parsing" ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              <input {...getInputProps()} />
              {step === "parsing" ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Procesando archivo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragActive ? "bg-primary/20 border-primary/30" : "bg-white/[0.04] border-white/[0.08]"} border`}>
                    <UploadIcon className={`w-7 h-7 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium mb-1">
                      {isDragActive ? "Soltá el archivo acá" : "Arrastrá o hacé clic para cargar"}
                    </p>
                    <p className="text-sm text-muted-foreground">CSV, XLSX o XLS · Máx. 10MB</p>
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
                  "Formatos con fecha DD/MM/YYYY o YYYY-MM-DD",
                  "Montos con coma decimal (ej: 1.500,00)",
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
