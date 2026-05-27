import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, ArrowUpRight, ArrowDownRight, Trash2, Loader2,
  ChevronLeft, ChevronRight, RefreshCw, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate, getCategoryLabel } from "@/lib/utils";
import type { Transaction } from "@/integrations/supabase/types";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (dateFrom) query = query.gte("date", dateFrom);
      if (dateTo) query = query.lte("date", dateTo);
      if (search) query = query.ilike("description", `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      setTransactions(data ?? []);
      setTotal(count ?? 0);
    } catch {
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [user, page, typeFilter, dateFrom, dateTo, search]);

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas tus transacciones importadas.</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
              <SelectItem value="expense">Egresos</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-full sm:w-40"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          />
          <Input
            type="date"
            className="w-full sm:w-40"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          />
          <Button variant="outline" size="icon" onClick={load}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </Card>

      {/* Summary stats for current view */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total ingresos", value: formatCurrency(totalIncome), color: "text-success" },
          { label: "Total egresos", value: formatCurrency(totalExpense), color: "text-destructive" },
          { label: `${total} transacciones`, value: formatCurrency(totalIncome - totalExpense), color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.07] bg-card/50 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-base font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
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
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
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
                    <TableCell className="text-sm max-w-[220px] truncate">{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryLabel(tx.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "income" ? "success" : "destructive"} className="text-[10px] gap-0.5">
                        {tx.type === "income"
                          ? <ArrowUpRight className="w-3 h-3" />
                          : <ArrowDownRight className="w-3 h-3" />}
                        {tx.type === "income" ? "Ingreso" : "Egreso"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-sm ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
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

      {/* Delete dialog */}
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
    </div>
  );
}

