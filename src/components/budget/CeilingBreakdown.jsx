import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { lineLabel } from '@/lib/budgetCeiling';

/** Every line that makes up the ceiling, listed so the figure can be audited. */
export default function CeilingBreakdown({ items = [], total = 0 }) {
  if (items.length === 0) return null;

  return (
    <Card className="p-5 border-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-foreground">What counts toward the ceiling</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Active monthly lines only, including a Ladder line once its rung has started.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Ceiling</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">KES {total.toLocaleString()}</p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li key={item.budget.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex items-center gap-2 min-w-0">
              <Check className="w-3.5 h-3.5 shrink-0 text-inflow" />
              <span className="text-sm text-foreground truncate">{item.budget.category || lineLabel(item)}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-foreground">
              KES {(item.budget.amount || 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}