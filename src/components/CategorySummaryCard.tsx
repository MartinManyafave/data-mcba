import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, getCategoryLabel } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/fileParser";

interface Props {
  transactions: ParsedTransaction[];
}

export default function CategorySummaryCard({ transactions }: Props) {
  const [open, setOpen] = useState(true);

  const totals = new Map<string, number>();
  for (const tx of transactions) {
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }

  const rows = [...totals.entries()].sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Resumen por categoría
          </p>
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="space-y-0.5">
            {rows.map(([category, total]) => (
              <div
                key={category}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-sm text-muted-foreground">
                  {getCategoryLabel(category)}
                </span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    total >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(Math.abs(total))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
