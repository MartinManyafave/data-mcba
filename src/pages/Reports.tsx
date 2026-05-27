import { useState, useEffect } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, Calendar } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getCategoryLabel } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = [
  "hsl(263 65% 60%)",
  "hsl(208 80% 60%)",
  "hsl(152 60% 40%)",
  "hsl(38 93% 48%)",
  "hsl(0 72% 51%)",
  "hsl(280 60% 55%)",
  "hsl(170 60% 45%)",
];

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryData {
  name: string;
  value: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthRange, setMonthRange] = useState("6");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryData[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [bestMonth, setBestMonth] = useState<MonthlyData | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const months = parseInt(monthRange);
      const fromDate = format(startOfMonth(subMonths(new Date(), months - 1)), "yyyy-MM-dd");
      const toDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount, type, category")
        .eq("user_id", user.id)
        .gte("date", fromDate)
        .lte("date", toDate);

      if (error) throw error;
      const txs = data ?? [];

      // Build monthly data
      const monthMap: Record<string, MonthlyData> = {};
      for (let i = months - 1; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const key = format(d, "yyyy-MM");
        monthMap[key] = {
          month: format(d, "MMM yy", { locale: es }),
          income: 0,
          expense: 0,
          net: 0,
        };
      }

      const incCat: Record<string, number> = {};
      const expCat: Record<string, number> = {};

      txs.forEach((tx) => {
        const key = tx.date.substring(0, 7);
        if (monthMap[key]) {
          if (tx.type === "income") {
            monthMap[key].income += tx.amount;
            incCat[tx.category] = (incCat[tx.category] ?? 0) + tx.amount;
          } else {
            monthMap[key].expense += tx.amount;
            expCat[tx.category] = (expCat[tx.category] ?? 0) + tx.amount;
          }
          monthMap[key].net = monthMap[key].income - monthMap[key].expense;
        }
      });

      const monthly = Object.values(monthMap);
      const incTotal = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expTotal = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const best = monthly.reduce((a, b) => (b.net > a.net ? b : a), monthly[0] ?? { net: 0 });

      setMonthlyData(monthly);
      setIncomeByCategory(Object.entries(incCat).map(([k, v]) => ({ name: getCategoryLabel(k), value: v })).sort((a, b) => b.value - a.value).slice(0, 7));
      setExpenseByCategory(Object.entries(expCat).map(([k, v]) => ({ name: getCategoryLabel(k), value: v })).sort((a, b) => b.value - a.value).slice(0, 7));
      setTotalIncome(incTotal);
      setTotalExpense(expTotal);
      setBestMonth(best);
    } catch {
      toast.error("Error al cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, monthRange]);

  const net = totalIncome - totalExpense;

  const tooltipStyle = {
    contentStyle: {
      background: "hsl(222 24% 13% / 0.95)",
      border: "1px solid hsl(222 18% 20%)",
      borderRadius: "10px",
      fontSize: "12px",
    },
    formatter: (v: number) => formatCurrency(v),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-1">Análisis y tendencias financieras.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={monthRange} onValueChange={setMonthRange}>
            <SelectTrigger className="w-36">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total ingresos", value: formatCurrency(totalIncome), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Total egresos", value: formatCurrency(totalExpense), icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Resultado neto", value: formatCurrency(net), icon: BarChart3, color: net >= 0 ? "text-primary" : "text-destructive", bg: net >= 0 ? "bg-primary/10" : "bg-destructive/10" },
          { label: "Mejor mes", value: bestMonth?.month ?? "—", icon: Calendar, color: "text-accent", bg: "bg-accent/10" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="monthly">
          <TabsList>
            <TabsTrigger value="monthly">Evolución mensual</TabsTrigger>
            <TabsTrigger value="categories">Por categorías</TabsTrigger>
            <TabsTrigger value="net">Resultado neto</TabsTrigger>
          </TabsList>

          {/* Monthly income vs expense */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ingresos vs Egresos por mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 20%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip {...tooltipStyle} />
                    <Legend formatter={(v) => v === "income" ? "Ingresos" : "Egresos"} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" fill="hsl(152 60% 40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-success">Ingresos por categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={incomeByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {incomeByCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle.contentStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-destructive">Egresos por categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {expenseByCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle.contentStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Net trend */}
          <TabsContent value="net">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resultado neto mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(263 65% 60%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(263 65% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 20%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip {...tooltipStyle} labelFormatter={(l) => `Mes: ${l}`} />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="hsl(263 65% 60%)"
                      fill="url(#netGrad)"
                      strokeWidth={2.5}
                      name="Resultado neto"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
