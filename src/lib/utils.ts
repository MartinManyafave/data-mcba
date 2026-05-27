import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: es });
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getTransactionTypeLabel(type: string): string {
  return type === "income" ? "Ingreso" : "Egreso";
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    bank_statement: "Extracto Bancario",
    transfer: "Transferencia",
    current_account: "Cuenta Corriente",
    comanda: "Comanda",
    other: "Otro",
    salary: "Salario",
    services: "Servicios",
    taxes: "Impuestos",
    sales: "Ventas",
    purchases: "Compras",
    fees: "Comisiones",
    interest: "Intereses",
  };
  return labels[category] ?? toTitleCase(category);
}
