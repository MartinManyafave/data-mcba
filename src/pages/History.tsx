import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, ArrowUpRight, ArrowDownRight, Trash2, Loader2,
  ChevronLeft, ChevronRight, RefreshCw, FileText, SlidersHorizontal, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getCategoryLabel } from "@/lib/utils";
import { SELECTABLE_CATEGORIES } from "@/lib/categoryDetector";
import { parseAmount } from "@/lib/fileParser";
import type { Transaction } from "@/integrations/supabase/types";
import { toast } from "sonner";

const PAGE_SIZE = 20;

type AmountOp = "gt" | "lt" | "gte" | "lte" | "between" | "";

const AMOUNT_OPS: { value: AmountOp; label: string }[] = [
  { value: "gt",      label: "Mayor que (>)" },
  { value: "gte",     label: "Mayor o igual (≥)" },
  { value: "lt",      label: "Menor que (<)" },
  { value: "lte",     label: "Menor o igual (≤)" },
  { value: "between", label: "Entre dos valores" },
];

export default function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountOp, setAmountOp] = useState<AmountOp>("");
  const [amountVal, setAmountVal] = useState("");
  const [amountVal2, setAmountVal2] = useState("");

  const [summaryIncome, setSummaryIncome] = useState(0);
  const [summaryExpense, setSummaryExpense] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const amountFilterVal = amountOp && amountVal ? (parseAmount(amountVal) ?? NaN) : NaN;
  const amountFilterActive = amountOp !== "" && !isNaN(amountFilterVal);

  const activeFilterCount = [
    typeFilter !== "all",
    categoryFilter !== "all",
    !!dateFrom,
    !!dateTo,
    amountFilterActive,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountOp("");
    setAmountVal("");
    setAmountVal2("");
    setPage(0);
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Build base filter — applied to both the paginated query and the totals query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addFilters = (q: any): any => {
        if (typeFilter !== "all") q = q.eq("type", typeFilter);
        if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
        if (dateFrom) q = q.gte("date", dateFrom);
        if (dateTo) q = q.lte("date", dateTo);
        if (search) q = q.ilike("description", `%${search}%`);
        if (amountOp && amountVal !== "") {
          const val = parseAmount(amountVal);
          if (val !== null) {
            if (amountOp === "gt")  q = q.gt("amount", val);
            if (amountOp === "lt")  q = q.lt("amount", val);
            if (amountOp === "gte") q = q.gte("amount", val);
            if (amountOp === "lte") q = q.lte("amount", val);
            if (amountOp === "between" && amountVal2 !== "") {
              const val2 = parseAmount(amountVal2);
              if (val2 !== null)
                q = q.gte("amount", Math.min(val, val2)).lte("amount", Math.max(val, val2));
            }
          }
        }
        return q;
      };

      const pageQuery = addFilters(
        supabase
          .from("transactions")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      );

      const totalsQuery = addFilters(
        supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user.id)
      );

      const [{ data, count, error }, { data: allData, error: totalsErr }] =
        await Promise.all([pageQuery, totalsQuery]);

      if (error) throw error;
      if (totalsErr) throw totalsErr;

      setTransactions(data ?? []);
      setTotal(count ?? 0);

      const all = allData ?? [];
      setSummaryIncome(all.filter((t) => t.type === "income").reduce((s, t) => s + Math.abs(t.amount), 0));
      setSummaryExpense(all.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0));
    } catch {
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [user, page, typeFilter, categoryFilter, dateFrom, dateTo, amountOp, amountVal, amountVal2, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("transactions").delete().eq("id", deleteTarget.id).eq("user_id", user!.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      toast.success("Transacción eliminada");
      load();
    }
  };

  const handleBulkDelete = async () => {
    if (!user) return;
    setBulkDeleting(true);
    try {
      if (activeFilterCount === 0 && !search) {
        // No filters → delete everything for this user
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Filters active → fetch matching IDs, delete in chunks
        let idsQuery = supabase.from("transactions").select("id").eq("user_id", user.id);
        if (typeFilter !== "all") idsQuery = idsQuery.eq("type", typeFilter);
        if (categoryFilter !== "all") idsQuery = idsQuery.eq("category", categoryFilter);
        if (dateFrom) idsQuery = idsQuery.gte("date", dateFrom);
        if (dateTo) idsQuery = idsQuery.lte("date", dateTo);
        if (search) idsQuery = idsQuery.ilike("description", `%${search}%`);
        if (amountOp && amountVal !== "") {
          const val = parseAmount(amountVal);
          if (val !== null) {
            if (amountOp === "gt")  idsQuery = idsQuery.gt("amount", val);
            if (amountOp === "lt")  idsQuery = idsQuery.lt("amount", val);
            if (amountOp === "gte") idsQuery = idsQuery.gte("amount", val);
            if (amountOp === "lte") idsQuery = idsQuery.lte("amount", val);
            if (amountOp === "between" && amountVal2 !== "") {
              const val2 = parseAmount(amountVal2);
              if (val2 !== null)
                idsQuery = idsQuery.gte("amount", Math.min(val, val2)).lte("amount", Math.max(val, val2));
            }
          }
        }
        const { data: ids, error: fetchErr } = await idsQuery;
        if (fetchErr) throw fetchErr;
        const CHUNK = 100;
        const allIds = (ids ?? []).map((r) => r.id);
        for (let i = 0; i < allIds.length; i += CHUNK) {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .in("id", allIds.slice(i, i + CHUNK));
          if (error) throw error;
        }
      }
      toast.success(`${total} transacciones eliminadas`);
      clearFilters();
      setBulkDeleteOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const amountOpLabel = AMOUNT_OPS.find((o) => o.value === amountOp)?.label ?? "";

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas tus transacciones importadas.</p>
      </div>

      {/* ── Search bar + filter toggle ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Button
          variant={filtersOpen ? "default" : "outline"}
          onClick={() => setFiltersOpen((o) => !o)}
          className="relative flex-shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={load} className="flex-shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {total > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setBulkDeleteOpen(true)}
            className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title={activeFilterCount > 0 || search ? `Borrar ${total} filtradas` : "Borrar todo el historial"}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* ── Expanded filters panel ── */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/[0.08] bg-card/60 p-4 space-y-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Type */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Tipo</p>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Categoría</p>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {SELECTABLE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Desde</p>
              <Input
                type="date"
                className="h-9 text-sm"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Hasta</p>
              <Input
                type="date"
                className="h-9 text-sm"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              />
            </div>

            {/* Amount operator */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Monto</p>
              <Select value={amountOp || "none"} onValueChange={(v) => { setAmountOp(v === "none" ? "" : v as AmountOp); setAmountVal(""); setAmountVal2(""); setPage(0); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sin filtro de monto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin filtro de monto</SelectItem>
                  {AMOUNT_OPS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount value(s) */}
            {amountOp && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">
                  {amountOp === "between" ? "Desde / Hasta" : "Valor"}
                </p>
                {amountOp === "between" ? (
                  <div className="flex gap-1.5">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="ej: 10.000"
                      className="h-9 text-sm"
                      value={amountVal}
                      onChange={(e) => { setAmountVal(e.target.value); setPage(0); }}
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="ej: 50.000"
                      className="h-9 text-sm"
                      value={amountVal2}
                      onChange={(e) => { setAmountVal2(e.target.value); setPage(0); }}
                    />
                  </div>
                ) : (
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="ej: 120.000 o -50.000"
                    className="h-9 text-sm"
                    value={amountVal}
                    onChange={(e) => { setAmountVal(e.target.value); setPage(0); }}
                  />
                )}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3 mr-1" /> Limpiar filtros
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && !filtersOpen && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">Filtros activos:</span>
          {typeFilter !== "all" && (
            <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => setTypeFilter("all")}>
              {typeFilter === "income" ? "Ingresos" : "Egresos"} <X className="w-3 h-3" />
            </Badge>
          )}
          {categoryFilter !== "all" && (
            <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => setCategoryFilter("all")}>
              {getCategoryLabel(categoryFilter)} <X className="w-3 h-3" />
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => setDateFrom("")}>
              Desde {dateFrom} <X className="w-3 h-3" />
            </Badge>
          )}
          {dateTo && (
            <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => setDateTo("")}>
              Hasta {dateTo} <X className="w-3 h-3" />
            </Badge>
          )}
          {amountFilterActive && (
            <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => { setAmountOp(""); setAmountVal(""); setAmountVal2(""); }}>
              Monto {amountOpLabel} {amountOp === "between" && amountVal2 ? `${formatCurrency(amountFilterVal)} – ${formatCurrency(parseAmount(amountVal2) ?? 0)}` : formatCurrency(amountFilterVal)} <X className="w-3 h-3" />
            </Badge>
          )}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpiar todo
          </button>
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total ingresos", value: formatCurrency(summaryIncome), color: "text-success" },
          { label: "Total egresos", value: formatCurrency(summaryExpense), color: "text-destructive" },
          { label: `${total} transacciones`, value: formatCurrency(summaryIncome - summaryExpense), color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.07] bg-card/50 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-base font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay transacciones que coincidan con los filtros</p>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3 text-xs">
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[160px] md:max-w-[220px] truncate">{tx.description}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryLabel(tx.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "income" ? "success" : "destructive"} className="text-[10px] gap-0.5">
                        {tx.type === "income" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {tx.type === "income" ? "Ingreso" : "Egreso"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-sm ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(tx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Delete single dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar transacción</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Querés eliminar esta transacción? Esta acción no se puede deshacer.
          </p>
          {deleteTarget && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-sm">
              <p className="font-medium">{deleteTarget.description}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {formatDate(deleteTarget.date)} · {formatCurrency(deleteTarget.amount)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk delete dialog ── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {activeFilterCount > 0 || search ? "Borrar transacciones filtradas" : "Borrar todo el historial"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {activeFilterCount > 0 || search
              ? <>Esto eliminará <span className="text-foreground font-semibold">{total} transacciones</span> que coinciden con los filtros activos. Esta acción no se puede deshacer.</>
              : <>Esto eliminará <span className="text-foreground font-semibold">todas las {total} transacciones</span> de tu cuenta. Esta acción no se puede deshacer.</>
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting
                ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Eliminando...</>
                : <><Trash2 className="w-4 h-4 mr-1.5" />Confirmar eliminación</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
