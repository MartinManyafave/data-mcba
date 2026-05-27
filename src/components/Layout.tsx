import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Upload, History, BarChart3, Settings,
  LogOut, Menu, X, TrendingUp, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Cargar Archivo" },
  { to: "/history", icon: History, label: "Historial" },
  { to: "/reports", icon: BarChart3, label: "Reportes" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada correctamente");
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]",
          collapsed && !mobile && "justify-center px-2"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <span className="font-bold text-sm text-gradient">Data MCBA</span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Análisis de Datos</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 mt-2">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => (
            <Tooltip key={item.to} disableHoverableContent={!collapsed || mobile}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  onClick={() => mobile && setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
                      collapsed && !mobile && "justify-center px-2"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {(!collapsed || mobile) && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              </TooltipTrigger>
              {collapsed && !mobile && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      {/* User */}
      <div className={cn("p-3 border-t border-white/[0.06]", collapsed && !mobile && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg p-2 hover:bg-white/[0.04] transition-colors",
            collapsed && !mobile && "justify-center"
          )}
        >
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile?.full_name ?? "Usuario"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
            </div>
          )}
          {(!collapsed || mobile) && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 flex-shrink-0 hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        {collapsed && !mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full mt-1 hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col flex-shrink-0 h-full transition-all duration-300",
          "bg-sidebar border-r border-sidebar-border",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute top-4 left-0 z-10 -translate-x-0 hidden lg:flex"
          style={{ left: collapsed ? "48px" : "208px" }}
        >
          <div className="w-5 h-5 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg hover:bg-primary/20 hover:border-primary/30 transition-colors">
            <ChevronRight
              className={cn("w-3 h-3 text-muted-foreground transition-transform", !collapsed && "rotate-180")}
            />
          </div>
        </button>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-[260px] bg-sidebar border-r border-sidebar-border lg:hidden"
            >
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-sidebar/50 backdrop-blur-sm">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-gradient">Data MCBA</span>
          </div>
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
