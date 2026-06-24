import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Upload, History, BarChart3, Settings,
  LogOut, TrendingUp, ChevronRight, User, GitCompare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Cargar" },
  { to: "/history", icon: History, label: "Historial" },
  { to: "/reports", icon: BarChart3, label: "Reportes" },
  { to: "/compare", icon: GitCompare, label: "Comparar" },
  { to: "/settings", icon: Settings, label: "Config" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
          className="absolute top-4 z-10 hidden lg:flex"
          style={{ left: collapsed ? "48px" : "208px" }}
        >
          <div className="w-5 h-5 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg hover:bg-primary/20 hover:border-primary/30 transition-colors">
            <ChevronRight
              className={cn("w-3 h-3 text-muted-foreground transition-transform", !collapsed && "rotate-180")}
            />
          </div>
        </button>

        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]",
              collapsed && "justify-center px-2"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && (
              <div>
                <span className="font-bold text-sm text-gradient">Data MCBA</span>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Análisis de Datos</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 space-y-0.5 mt-2">
            <TooltipProvider delayDuration={0}>
              {navItems.map((item) =>
                collapsed ? (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
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
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                      </>
                    )}
                  </NavLink>
                )
              )}
            </TooltipProvider>
          </nav>

          {/* User */}
          <div className={cn("p-3 border-t border-white/[0.06]", collapsed && "px-2")}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg p-2 hover:bg-white/[0.04] transition-colors",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{profile?.full_name ?? "Usuario"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
                </div>
              )}
              {!collapsed && (
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
            {collapsed && (
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
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-sidebar/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm text-gradient">Data MCBA</span>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.05] transition-colors"
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-white/[0.09] bg-card/95 backdrop-blur-xl shadow-xl p-1"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-xs font-medium truncate">{profile?.full_name ?? "Usuario"}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{profile?.email}</p>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Cerrar sesión
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar/95 backdrop-blur-xl border-t border-white/[0.08] safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-0 flex-1",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                      isActive
                        ? "bg-primary/15"
                        : "bg-transparent"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
