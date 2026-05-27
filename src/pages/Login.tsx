import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Ingresá tu nombre completo"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  const handleLogin = async (data: LoginData) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    setLoading(false);
    if (error) {
      toast.error("Credenciales incorrectas. Verificá tu email y contraseña.");
    }
  };

  const handleRegister = async (data: RegisterData) => {
    setLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already registered")
        ? "Este email ya está registrado."
        : "Error al crear la cuenta. Intentá de nuevo.");
    } else {
      toast.success("¡Cuenta creada! Revisá tu email para confirmar.");
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-xl text-gradient">Data MCBA</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">Sistema de análisis de datos</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.09] bg-card/80 backdrop-blur-xl shadow-2xl p-8">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Crear cuenta</TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="vos@ejemplo.com"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Iniciar sesión"}
                </Button>
              </form>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Nombre completo</Label>
                  <Input
                    id="reg-name"
                    placeholder="Juan Pérez"
                    {...registerForm.register("fullName")}
                  />
                  {registerForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="vos@ejemplo.com"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-pass">Contraseña</Label>
                  <Input
                    id="reg-pass"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">Confirmar contraseña</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    placeholder="••••••••"
                    {...registerForm.register("confirmPassword")}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/" className="hover:text-foreground transition-colors">← Volver al inicio</Link>
        </p>
      </motion.div>
    </div>
  );
}
