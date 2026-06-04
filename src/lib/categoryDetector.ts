export const CATEGORY_LABELS: Record<string, string> = {
  bank_tax:         "Impuesto Déb/Créd Bancario",
  iva:              "IVA",
  taxes:            "Impuestos y Percepciones",
  afip:             "AFIP / ARCA",
  transfer_in:      "Transferencia recibida",
  transfer_out:     "Transferencia realizada",
  supplier_payment: "Pago a proveedores",
  salaries:         "Sueldos y haberes",
  honorarios:       "Honorarios",
  investments:      "Inversiones / Fondos",
  credit_card:      "Tarjeta de crédito",
  checks:           "Cheques",
  utilities:        "Servicios públicos",
  auto_debit:       "Débito Automático",
  bank_fees:        "Comisiones bancarias",
  debin:            "DEBIN",
  other:            "Otros",
  // legacy values from file-type-based categorization
  bank_statement:   "Extracto Bancario",
  transfer:         "Transferencia",
  current_account:  "Cuenta Corriente",
  comanda:          "Comanda",
};

/** All selectable categories for filter dropdowns */
export const SELECTABLE_CATEGORIES = [
  { value: "bank_tax",         label: "Impuesto Déb/Créd Bancario" },
  { value: "iva",              label: "IVA" },
  { value: "taxes",            label: "Impuestos y Percepciones" },
  { value: "afip",             label: "AFIP / ARCA" },
  { value: "transfer_in",      label: "Transferencia recibida" },
  { value: "transfer_out",     label: "Transferencia realizada" },
  { value: "supplier_payment", label: "Pago a proveedores" },
  { value: "salaries",         label: "Sueldos y haberes" },
  { value: "honorarios",       label: "Honorarios" },
  { value: "investments",      label: "Inversiones / Fondos" },
  { value: "credit_card",      label: "Tarjeta de crédito" },
  { value: "checks",           label: "Cheques" },
  { value: "utilities",        label: "Servicios públicos" },
  { value: "auto_debit",       label: "Débito Automático" },
  { value: "bank_fees",        label: "Comisiones bancarias" },
  { value: "debin",            label: "DEBIN" },
  { value: "other",            label: "Otros" },
];

// Normalize: remove accents, lowercase
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Detect the transaction category from its description and type (income/expense).
 * Uses ordered rules — most specific patterns first.
 */
export function detectCategory(description: string, type: "income" | "expense"): string {
  const d = norm(description);

  // ── AFIP / ARCA (same entity, renamed in 2024) ─────────────────────────────
  if (/\bafip\b|\barca\b|recaudaciones afip|pago afip|obligaciones.*arca|pago.*arca/.test(d)) return "afip";

  // ── Banco tax (Impuesto al débito/crédito bancario - Ley 25.413) ───────────
  if (/impuesto ley|impuesto deb|impuesto cred/.test(d)) return "bank_tax";

  // ── IVA ────────────────────────────────────────────────────────────────────
  if (/\biva\b|\bi\.v\.a\b|debito fiscal/.test(d)) return "iva";

  // ── Taxes / percepciones (SIRCREB, IIBB, sellos, retenciones) ─────────────
  if (
    /percepcion|ingresos brutos|iibb|impuesto de sellos|sircreb|rg 2408|reg.*recaudacion|arba/.test(d)
  ) return "taxes";

  // ── Salaries / payroll ─────────────────────────────────────────────────────
  if (/haberes|sueldo|jornal|pago.*haberes|liquidacion.*sueldo/.test(d)) return "salaries";

  // ── Professional fees ──────────────────────────────────────────────────────
  if (/honorario/.test(d)) return "honorarios";

  // ── Investments / funds ────────────────────────────────────────────────────
  if (
    /superfondo|fondo comun|fondo de inversion|suscripcion fondo|rescate fondo|rescate|inversion|plazo fijo|deposito plazo/.test(d)
  ) return "investments";

  // ── Credit card payments ───────────────────────────────────────────────────
  if (/visa|mastercard|amex|naranja|cabal|tarjeta de credito|pago.*tarjeta|tarjeta.*pago/.test(d)) return "credit_card";

  // ── Checks ─────────────────────────────────────────────────────────────────
  if (/e.?cheq|echeq|deposito.*cheq|cfu depecheq|cheque/.test(d)) return "checks";

  // ── Utilities / named public services ─────────────────────────────────────
  if (
    /edenor|metrogas|aysa|gcba.pvg|aguas|telecom|personal|claro|movistar|telefonica|telecentro|cablevision|fibertel|directv|luz|gas\b|agua\b/.test(d)
  ) return "utilities";

  if (/pago de servicios|pago servicio/.test(d)) return "utilities";

  // ── Automatic debits (generic — when no named service matched above) ────────
  if (/debito automatico|debito.*aut\b|deb\.?\s*autom/.test(d)) return "auto_debit";

  // ── Bank fees / commissions ────────────────────────────────────────────────
  if (
    /comision|custodia|descubierto|interes.*descubierto|cobro.*interes|mantenimiento|cargo.*servicio|seg.*negocio|segurcoop|seguro/.test(d)
  ) return "bank_fees";

  // ── DEBIN ──────────────────────────────────────────────────────────────────
  if (/debin/.test(d)) return "debin";

  // ── Supplier payments ──────────────────────────────────────────────────────
  if (/proveedor|pago.*proveedor|proveedor.*recibido|pago.*tercero/.test(d)) return "supplier_payment";

  // ── Transfers (fallback by type) ───────────────────────────────────────────
  if (
    /transf|transferencia|credito transf|debito transf|pago cci|pago.*online banking/.test(d)
  ) {
    return type === "income" ? "transfer_in" : "transfer_out";
  }

  // ── Generic fallback by direction ──────────────────────────────────────────
  return type === "income" ? "transfer_in" : "other";
}
