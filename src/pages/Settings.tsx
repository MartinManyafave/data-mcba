import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Lock, Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const profileSchema = z.object({
  fullName: z.string().min(2, "Nombre demasiado corto"),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: profile?.full_name ?? "" },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleSaveProfile = async (data: ProfileData) => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Error al guardar el perfil");
    } else {
      await refreshProfile();
      toast.success("Perfil actualizado correctamente");
    }
  };

  const handleChangePassword = async (data: PasswordData) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Error al cambiar la contraseña");
    } else {
      passwordForm.reset();
      toast.success("Contraseña actualizada correctamente");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "ELIMINAR") return;
    setDeleting(true);
    // Delete all user data via cascade (RLS ensures only own data)
    if (user) {
      await supabase.from("transactions").delete().eq("user_id", user.id);
      await supabase.from("file_uploads").delete().eq("user_id", user.id);
    }
    await signOut();
    toast.success("Cuenta eliminada");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestioná tu cuenta y preferencias.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{profile?.full_name ?? "Usuario"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" {...profileForm.register("fullName")} />
              {profileForm.formState.errors.fullName && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="opacity-50 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
            </div>
            <Button type="submit" disabled={savingProfile} className="gap-2">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPass">Nueva contraseña</Label>
              <Input id="newPass" type="password" placeholder="Mínimo 6 caracteres" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPass">Confirmar contraseña</Label>
              <Input id="confirmPass" type="password" placeholder="••••••••" {...passwordForm.register("confirmPassword")} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" variant="outline" disabled={savingPassword} className="gap-2">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Actualizar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Información de la cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "ID de usuario", value: user?.id?.slice(0, 8) + "..." },
            { label: "Email confirmado", value: user?.email_confirmed_at ? "Sí" : "No" },
            { label: "Cuenta creada", value: user?.created_at ? new Date(user.created_at).toLocaleDateString("es-AR") : "—" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Zona de peligro
          </CardTitle>
          <CardDescription>Estas acciones son irreversibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="gap-2 bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta y todos mis datos
          </Button>
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); setDeleteConfirm(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar cuenta</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente tu cuenta y todos los datos asociados (transacciones, archivos, etc.). No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Escribí <strong>ELIMINAR</strong> para confirmar</Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="ELIMINAR"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "ELIMINAR" || deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Eliminar cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
