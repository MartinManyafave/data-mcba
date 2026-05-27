import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, TrendingUp, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: LoginData) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    setLoading(false);
    if (error) {
      toast.error("Credenciales incorrectas. Verificá tu email y contraseña.");
    }
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail);
    setForgotLoading(false);
    if (error) {
      toast.error("No se pudo enviar el email. Verificá la dirección.");
    } else {
      toast.success("Email de recuperación enviado. Revisá tu bandeja.");
      setForgotMode(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-700 text-xl text-gradient">Data MCBA</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">Mercado Central · Buenos Aires</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.09] bg-card/80 backdrop-blur-xl shadow-2xl p-7">
          {!forgotMode ? (
            <>
              <div className="flex items-center gap-2 mb-6">
                <KeyRound className="w-4 h-4 text-primary" />
                <h2 className="font-display font-600 text-base">Acceder al sistema</h2>
              </div>

              <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full font-display font-600" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
                </Button>
              </form>

              <button
                onClick={() => setForgotMode(true)}
                className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="font-display font-600 text-base mb-1">Recuperar contraseña</h2>
                <p className="text-xs text-muted-foreground">Ingresá tu email y te enviamos el link.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <Button onClick={handleForgot} className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar link"}
                </Button>
                <button
                  onClick={() => setForgotMode(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Volver al login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          ¿No tenés cuenta?{" "}
          <Link to="/#precios" className="text-primary hover:underline">
            Adquirí un plan
          </Link>
        </p>

        <p className="text-center mt-3">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
