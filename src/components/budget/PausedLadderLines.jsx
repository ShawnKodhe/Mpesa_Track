import { Card } from '@/components/ui/card';
import { Minus } from 'lucide-react';
import { lineLabel } from '@/lib/budgetCeiling';

/** Ladder lines left out of the ceiling, with the amount and the reason why. */
export default function PausedLadderLines({ items = [] }) {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + (item.budget.amount || 0), 0);

  return (
    <Card className="p-5 border-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-foreground">Not counted</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ladder lines left out of the ceiling, so nothing goes missing silently.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Not counted in total</p>
          <p className="text-sm font-semibold tabular-nums text-muted-foreground">KES {total.toLocaleString()}</p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li key={item.budget.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex items-start gap-2 min-w-0">
              <Minus className="w-3.5 h-3.5 shrink-0 mt-1 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">{lineLabel(item)}</span>
                <span className="block text-xs text-muted-foreground">{item.reason}</span>
              </span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              KES {(item.budget.amount || 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}