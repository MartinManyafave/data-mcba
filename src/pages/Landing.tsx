import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useAnimation, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle2, TrendingUp, BarChart3,
  Upload, Shield, Zap, Building2, ChevronRight,
  Star, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Animated counter ───────────────────────────────────────────────────────
function Counter({ to, prefix = "", suffix = "", duration = 2 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const steps = 60;
    const inc = to / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, (duration * 1000) / steps);
    return () => clearInterval(timer);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString("es-AR")}{suffix}
    </span>
  );
}

// ─── Ticker data ────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: "Transferencias procesadas", value: "+$2.4M", up: true },
  { label: "Puestos activos", value: "847" },
  { label: "Extractos analizados", value: "12.340" },
  { label: "Operaciones hoy", value: "+4.821", up: true },
  { label: "Cuentas corrientes", value: "203" },
  { label: "Egresos registrados", value: "$890K", up: false },
  { label: "Banco Nación", value: "✓ Soporte" },
  { label: "Banco Provincia", value: "✓ Soporte" },
  { label: "BBVA · Santander · Galicia", value: "✓ Soporte" },
  { label: "Comandas importadas", value: "38.900" },
  { label: "DEBIN procesado", value: "+$1.1M", up: true },
  { label: "Tiempo de análisis", value: "< 30s" },
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-2.5">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-6 whitespace-nowrap">
            <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
            <span className={`text-xs font-bold tabular-nums ${
              item.up === true ? "text-emerald-400" : item.up === false ? "text-red-400" : "text-amber-400"
            }`}>
              {item.value}
            </span>
            <span className="text-white/10 ml-4">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pricing plans ─────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Básico",
    price: "4.990",
    desc: "Para puestos individuales que quieren orden.",
    color: "border-white/10",
    highlight: false,
    paymentUrl: "", // → link de Mercado Pago
    features: [
      "1 puesto / usuario",
      "Carga de extractos CSV y Excel",
      "Resumen diario automático",
      "Historial 3 meses",
      "Soporte por email",
    ],
    cta: "Empezar",
  },
  {
    name: "Operador",
    price: "9.990",
    desc: "Para operadores con múltiples puestos.",
    color: "border-primary/40",
    highlight: true,
    badge: "MÁS ELEGIDO",
    paymentUrl: "", // → link de Mercado Pago
    features: [
      "Hasta 5 puestos / usuarios",
      "Todos los formatos bancarios AR",
      "Reportes y gráficos avanzados",
      "Historial ilimitado",
      "Exportación PDF / Excel",
      "Soporte prioritario",
    ],
    cta: "Comenzar ahora",
  },
  {
    name: "Mercado",
    price: "19.990",
    desc: "Para administradores del Mercado Central.",
    color: "border-white/10",
    highlight: false,
    paymentUrl: "", // → link de Mercado Pago
    features: [
      "Puestos ilimitados",
      "Vista consolidada del mercado",
      "API de integración",
      "Análisis comparativo entre puestos",
      "Reportes para AFIP / auditoría",
      "Soporte dedicado 24/7",
    ],
    cta: "Contactar",
  },
];

// ─── Features ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: FileSpreadsheet,
    title: "Todos los bancos argentinos",
    body: "Banco Nación, Provincia, BBVA, Santander, Galicia, ICBC y más. Parser automático que detecta el formato.",
    accent: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: BarChart3,
    title: "Resumen diario por puesto",
    body: "Cada operador ve solo sus datos. Ingresos, egresos, saldo neto y movimientos del día en segundos.",
    accent: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: TrendingUp,
    title: "Análisis histórico",
    body: "Gráficos de evolución mensual, categorías de gasto y tendencias. Toda la información para tomar decisiones.",
    accent: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Upload,
    title: "Importación en segundos",
    body: "Arrastrá el extracto bancario, la comanda o la planilla. El sistema detecta columnas automáticamente.",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: Shield,
    title: "Datos 100% privados",
    body: "Cada puesto ve únicamente su propia información. Aislamiento total garantizado a nivel base de datos.",
    accent: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    icon: Building2,
    title: "Pensado para el MCBA",
    body: "Soporta comandas, cuentas corrientes, DEBIN y los flujos específicos del Mercado Central de Buenos Aires.",
    accent: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
];

// ─── Main component ─────────────────────────────────────────────────────────
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="min-h-screen bg-mesh text-foreground overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-xl border-b border-white/[0.06] shadow-xl shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-display font-800 text-base tracking-tight text-gradient">Data MCBA</span>
              <span className="text-[10px] text-muted-foreground ml-2 hidden sm:inline">Mercado Central · Buenos Aires</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm hidden sm:flex">Ingresar</Button>
            </Link>
            <a href="#precios">
              <Button size="sm" className="text-sm gap-1.5 font-display font-600">
                Ver planes <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-5 market-grid">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-56 h-56 rounded-full bg-amber-500/8 blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Copy */}
            <div>
              <motion.div
                custom={0} variants={fadeUp} initial="hidden" animate="visible"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400 text-xs font-semibold mb-6 font-display tracking-wide"
              >
                <Building2 className="w-3.5 h-3.5" />
                MERCADO CENTRAL · BUENOS AIRES
              </motion.div>

              <motion.h1
                custom={1} variants={fadeUp} initial="hidden" animate="visible"
                className="font-display text-5xl lg:text-6xl font-800 leading-[1.05] tracking-tight mb-6"
              >
                El control total de{" "}
                <span className="relative">
                  <span className="text-gradient">cada puesto</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 6C50 2 150 2 198 6" stroke="hsl(263 65% 60%)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
                  </svg>
                </span>
                <br />del mercado
              </motion.h1>

              <motion.p
                custom={2} variants={fadeUp} initial="hidden" animate="visible"
                className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md"
              >
                Analizá extractos bancarios, transferencias, cuentas corrientes y comandas. Resumen diario automático para cada operador del MCBA.
              </motion.p>

              <motion.div
                custom={3} variants={fadeUp} initial="hidden" animate="visible"
                className="flex flex-col sm:flex-row gap-3"
              >
                <a href="#precios">
                  <Button size="lg" className="gap-2 w-full sm:w-auto font-display font-600 text-base px-6 h-12">
                    Ver planes y precios <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto font-display font-600 text-base h-12">
                    Ingresar
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                custom={4} variants={fadeUp} initial="hidden" animate="visible"
                className="flex items-center gap-4 mt-6"
              >
                {["Sin tarjeta", "Datos seguros", "Soporte en español"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-3xl scale-90" />

              <div className="relative rounded-2xl border border-white/[0.08] bg-card/70 backdrop-blur-xl overflow-hidden shadow-2xl">
                {/* Header bar */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  <div className="ml-3 flex-1 h-5 rounded bg-white/[0.04] flex items-center px-2">
                    <span className="text-[10px] text-muted-foreground">data-mcba.vercel.app/dashboard</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Ingresos", value: "$348.200", color: "text-emerald-400", icon: ArrowUpRight },
                      { label: "Egresos", value: "$201.800", color: "text-rose-400", icon: ArrowDownRight },
                      { label: "Neto", value: "+$146.400", color: "text-violet-400", icon: TrendingUp },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{s.label}</span>
                          <s.icon className={`w-3 h-3 ${s.color}`} />
                        </div>
                        <p className={`text-sm font-display font-700 tabular-nums ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                    <p className="text-[10px] text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Últimos 7 días</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[35, 58, 42, 71, 52, 88, 65].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.6 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                          style={{ height: `${h}%`, transformOrigin: "bottom" }}
                          className={`flex-1 rounded-t-sm ${i === 5 ? "bg-primary" : "bg-primary/25"}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                        <span key={d} className="text-[9px] text-muted-foreground flex-1 text-center">{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recent transactions */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 space-y-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Últimos movimientos</p>
                    {[
                      { desc: "Transferencia Banco Nación", amount: "+$84.500", income: true },
                      { desc: "Comanda #4821 — Puestero Sección B", amount: "+$12.300", income: true },
                      { desc: "Pago proveedor frutas", amount: "-$45.000", income: false },
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${tx.income ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                            {tx.income
                              ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                              : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">{tx.desc}</span>
                        </div>
                        <span className={`text-[10px] font-bold tabular-nums ${tx.income ? "text-emerald-400" : "text-rose-400"}`}>{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────── */}
      <Ticker />

      {/* ── STATS ───────────────────────────────────────────── */}
      <section className="py-16 px-5 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 847, suffix: "+", label: "Puestos activos", color: "text-violet-400 stat-glow" },
            { value: 38900, suffix: "", label: "Operaciones analizadas", color: "text-blue-400" },
            { value: 99, suffix: "%", label: "Uptime garantizado", color: "text-emerald-400" },
            { value: 30, suffix: "s", label: "Tiempo de análisis", color: "text-amber-400 amber-glow" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <div className={`font-display text-4xl font-800 tabular-nums mb-1 ${s.color}`}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PROBLEMA / SOLUCIÓN ─────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold mb-6 font-display"
          >
            EL PROBLEMA HOY
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-700 tracking-tight mb-5"
          >
            Planillas de Excel, extractos en papel y horas perdidas
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10"
          >
            Cada operador del Mercado Central procesa decenas de movimientos diarios entre Banco Nación, transferencias, DEBIN y comandas. Sin un sistema, los errores y el tiempo perdido son el costo invisible.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            {[
              { before: "Horas cruzando extractos a mano", after: "Importación automática en segundos" },
              { before: "Sin visibilidad del flujo diario", after: "Resumen del día con un click" },
              { before: "Datos mezclados entre puestos", after: "Aislamiento total por usuario" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="rounded-xl border border-white/[0.07] bg-card/40 backdrop-blur-sm overflow-hidden"
              >
                <div className="p-4 border-b border-white/[0.05] bg-rose-500/[0.04]">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">Antes</span>
                  <p className="text-sm text-muted-foreground mt-1">{item.before}</p>
                </div>
                <div className="p-4">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Con Data MCBA</span>
                  <p className="text-sm mt-1">{item.after}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.05] market-grid">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold mb-4 font-display"
            >
              <Zap className="w-3.5 h-3.5" />
              FUNCIONALIDADES
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="font-display text-3xl md:text-4xl font-700 tracking-tight"
            >
              Todo lo que necesita un operador del MCBA
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group rounded-xl border border-white/[0.07] bg-card/40 backdrop-blur-sm p-5 hover:border-white/15 hover:bg-card/60 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} border flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.accent}`} />
                </div>
                <h3 className="font-display font-600 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl md:text-4xl font-700 tracking-tight"
            >
              En funcionamiento en menos de 5 minutos
            </motion.h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { n: "01", title: "Creá tu cuenta", body: "Registro con email. Cada usuario tiene sus datos completamente aislados.", icon: Shield },
                { n: "02", title: "Cargá el extracto", body: "Arrastrá el CSV o Excel del banco. Detección automática de columnas.", icon: Upload },
                { n: "03", title: "Analizá al instante", body: "Resumen del día, historial y reportes disponibles de forma inmediata.", icon: BarChart3 },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="text-center"
                >
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-[10px] font-display font-700 text-primary">{step.n}</span>
                    </div>
                  </div>
                  <h3 className="font-display font-600 text-base mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="precios" className="py-20 px-5 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-semibold mb-4 font-display"
            >
              PRECIOS EN ARS · IVA INCLUIDO
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="font-display text-3xl md:text-4xl font-700 tracking-tight"
            >
              Planes para cada escala del mercado
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 ${plan.color} ${
                  plan.highlight
                    ? "bg-primary/[0.08] shadow-2xl shadow-primary/10 scale-[1.02]"
                    : "bg-card/40 backdrop-blur-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-display font-700 tracking-widest">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-display font-700 text-lg mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <span className="font-display text-4xl font-800 text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <a href={plan.paymentUrl ?? "#precios"}>
                  <Button
                    className="w-full font-display font-600"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>

          {/* Mercado Pago badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <span className="text-sky-400 font-display font-800 text-xs">MP</span>
              </div>
              <span className="text-sm text-sky-300 font-medium">Pagos con Mercado Pago</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {["Tarjeta de crédito", "Débito", "Efectivo", "Transferencia"].map((m) => (
                <span key={m} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {m}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section className="py-16 px-5 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                quote: "Antes tardaba 2 horas en cruzar los extractos del Nación con las comandas. Ahora en 5 minutos tengo todo el cierre del día.",
                name: "Carlos M.",
                role: "Puesto de frutas · Sección A",
              },
              {
                quote: "El sistema detectó automáticamente el formato del banco. Solo arrastré el archivo y ya tenía el resumen. Increíble.",
                name: "Graciela P.",
                role: "Verdulería · Sección C",
              },
              {
                quote: "Por fin cada uno ve solo sus datos. Antes había confusiones entre puestos. Ahora cada operador maneja su propia información.",
                name: "Roberto L.",
                role: "Carnicería · Sección D",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-white/[0.07] bg-card/40 p-5"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-primary/20 bg-primary/[0.06] p-10 text-center overflow-hidden"
          >
            <div className="absolute inset-0 market-grid opacity-40" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/15 blur-[60px] rounded-full" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/15 text-primary text-xs font-display font-600 mb-5 tracking-wide">
                <Building2 className="w-3.5 h-3.5" />
                MERCADO CENTRAL DE BUENOS AIRES
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-700 tracking-tight mb-4">
                Empezá a analizar tu operación hoy
              </h2>
              <p className="text-muted-foreground mb-7 max-w-lg mx-auto">
                14 días gratis, sin tarjeta. Configurá tu puesto en menos de 5 minutos.
              </p>
              <a href="#precios">
                <Button size="xl" className="gap-2 font-display font-600 text-base px-8">
                  Ver planes y precios <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <span className="font-display font-700 text-sm text-gradient">Data MCBA</span>
              <span className="text-xs text-muted-foreground ml-2">Sistema de análisis financiero</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Data MCBA · Mercado Central de Buenos Aires
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Ingresar</Link>
            <a href="#precios" className="hover:text-foreground transition-colors">Precios</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
