import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, Upload, History, BarChart3, Shield, Zap,
  ArrowRight, CheckCircle2, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Upload,
    title: "Carga de Archivos",
    description: "Importá extractos bancarios, transferencias, cuentas corrientes y comandas en CSV o Excel.",
  },
  {
    icon: History,
    title: "Resumen Diario",
    description: "Visualizá todo lo que pasó en el día: ingresos, egresos y saldo neto al instante.",
  },
  {
    icon: BarChart3,
    title: "Análisis Histórico",
    description: "Explorá el historial completo con filtros avanzados y gráficos de evolución.",
  },
  {
    icon: Shield,
    title: "Datos Seguros",
    description: "Cada usuario tiene acceso únicamente a sus propios datos, sin filtraciones.",
  },
  {
    icon: Zap,
    title: "Detección Automática",
    description: "El parser detecta columnas automáticamente en la mayoría de formatos bancarios argentinos.",
  },
  {
    icon: Database,
    title: "Registro Permanente",
    description: "Todo queda guardado y disponible siempre, con historial ilimitado.",
  },
];

const steps = [
  { num: "01", title: "Creá tu cuenta", desc: "Registro en segundos con email y contraseña." },
  { num: "02", title: "Cargá tu archivo", desc: "Arrastrá tu extracto CSV o Excel al sistema." },
  { num: "03", title: "Analizá los datos", desc: "Resumen automático y gráficos listos para revisar." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-mesh text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.05] bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm text-gradient">Data MCBA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Iniciar sesión</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Comenzar gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium mb-6">
              <Zap className="w-3 h-3" />
              Sistema de análisis financiero
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Tomá el control de{" "}
              <span className="text-gradient">tus datos</span>
              <br />
              financieros
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Cargá extractos bancarios, transferencias y comandas. Obtenéresúmenes diarios y análisis históricos en segundos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login">
                <Button size="xl" className="gap-2 w-full sm:w-auto">
                  Empezar ahora <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Ver demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden p-6">
              {/* Mock dashboard */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Ingresos Hoy", value: "$124,500", color: "text-success" },
                  { label: "Egresos Hoy", value: "$87,200", color: "text-destructive" },
                  { label: "Saldo Neto", value: "+$37,300", color: "text-primary" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-left">
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] h-32 flex items-center justify-center">
                <div className="flex items-end gap-2 h-20">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="w-6 rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        background: i === 5
                          ? "hsl(263 65% 60%)"
                          : "hsl(263 65% 60% / 0.3)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Todo lo que necesitás</h2>
            <p className="text-muted-foreground">Herramientas pensadas para el análisis financiero argentino.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-white/[0.07] bg-card/50 backdrop-blur-sm p-5 hover:border-primary/20 hover:bg-primary/[0.03] transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center mb-3">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Cómo funciona</h2>
            <p className="text-muted-foreground">Tres pasos para tener tus datos organizados.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold text-sm">{step.num}</span>
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] backdrop-blur-sm p-10">
            <h2 className="text-3xl font-bold mb-4">Empezá hoy, gratis</h2>
            <p className="text-muted-foreground mb-6">
              Sin tarjeta de crédito. Tus datos siempre privados y seguros.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
              {["Datos aislados por usuario", "Sin límite de archivos", "Soporte CSV y Excel"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Link to="/login">
              <Button size="xl" className="gap-2">
                Crear cuenta gratis <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">Data MCBA</span>
        </div>
        <p>© {new Date().getFullYear()} Data MCBA. Sistema de análisis de datos financieros.</p>
      </footer>
    </div>
  );
}
