import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Wallet, Upload, ArrowUpRight,
  ArrowDownRight, FileText, Calendar, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/integrations/supabase/types";
import { toast } from "sonner";

interface DailyStat {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  const [loading, setLoading] = useState(true);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [weekStats, setWeekStats] = useState<DailyStat[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [uploadsCount, setUploadsCount] = useState(0);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Last 5 transactions (any date)
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      // All-time totals
      const { data: allTxs } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user.id);

      // Last 30 days for chart
      const thirtyDaysAgo = format(
        new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      );
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: weekTxs } = await supabase
        .from("transactions")
        .select("date, amount, type")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgo)
        .lte("date", today);

      // Uploads count
      const { count } = await supabase
        .from("file_uploads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Build 30-day chart data (group by week for readability)
      const statsMap: Record<string, DailyStat> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(new Date(Date.now() - i * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
        statsMap[d] = {
          date: format(new Date(Date.now() - i * 24 * 60 * 60 * 1000), "dd/MM"),
          income: 0,
          expense: 0,
          net: 0,
        };
      }

      (weekTxs ?? []).forEach((tx) => {
        if (statsMap[tx.date]) {
          if (tx.type === "income") statsMap[tx.date].income += tx.amount;
          else statsMap[tx.date].expense += tx.amount;
          statsMap[tx.date].net = statsMap[tx.date].income - statsMap[tx.date].expense;
        }
      });

      // Sample every ~4 days so the chart doesn't get too crowded
      const allDays = Object.values(statsMap);
      const sampled = allDays.filter((_, i) => i % 4 === 0 || i === allDays.length - 1);

      // All-time totals
      const inc = (allTxs ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = (allTxs ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      setRecentTxs(txs ?? []);
      setWeekStats(sampled);
      setTotalIncome(inc);
      setTotalExpense(exp);
      setUploadsCount(count ?? 0);
    } catch {
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch every time the user navigates to /dashboard
  useEffect(() => {
    loadData();
  }, [user, location.key]);

  const net = totalIncome - totalExpense;

  const stats = [
    {
      label: "Total ingresos",
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
    {
      label: "Total egresos",
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
    },
    {
      label: "Saldo neto",
      value: formatCurrency(net),
      icon: Wallet,
      color: net >= 0 ? "text-primary" : "text-destructive",
      bg: net >= 0 ? "bg-primary/10" : "bg-destructive/10",
      border: net >= 0 ? "border-primary/20" : "border-destructive/20",
    },
    {
      label: "Archivos cargados",
      value: String(uploadsCount),
      icon: FileText,
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/20",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Buen día, {profile?.full_name?.split(" ")[0] ?? "Usuario"} 👋
          </h1>
          <p className="text-muted-foreground text-sm capitalize mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link to="/upload">
            <Button size="sm" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Cargar archivo
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <AreaChart data={weekStats} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152 60% 40%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152 60% 40%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    contentStyle={{
                      background: "hsl(222 24% 13% / 0.95)",
                      border: "1px solid hsl(222 18% 20%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number, name: string) => [
                      formatCurrency(v),
                      name === "income" ? "Ingresos" : "Egresos",
                    ]}
                  />
                  <Area type="monotone" dataKey="income" stroke="hsl(152 60% 40%)" fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="hsl(0 72% 51%)" fill="url(#expenseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">Últimos movimientos</CardTitle>
            {recentTxs.length > 0 && (
              <Link to="/history">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">Ver todos</Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : recentTxs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin movimientos registrados</p>
                <Link to="/upload">
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                    <Upload className="w-3 h-3" />
                    Cargar archivo
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          tx.type === "income"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {tx.type === "income"
                          ? <ArrowUpRight className="w-3.5 h-3.5" />
                          : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold flex-shrink-0 ml-2 ${
                        tx.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { to: "/upload", icon: Upload, label: "Cargar archivo", desc: "CSV o Excel" },
          { to: "/history", icon: FileText, label: "Ver historial", desc: "Todas las transacciones" },
          { to: "/reports", icon: TrendingUp, label: "Reportes", desc: "Análisis y gráficos" },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="p-4 hover:border-primary/20 hover:bg-primary/[0.03] transition-all cursor-pointer group">
              <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
