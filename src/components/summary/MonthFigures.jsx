import { PiggyBank, Receipt, Landmark, Wallet } from 'lucide-react';

function Figure({ label, value, note, icon: Icon, tone, valueTone = 'text-foreground' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
      </div>
      <p className={`mt-1 text-right font-heading text-xl font-bold tabular-nums sm:text-2xl ${valueTone}`}>
        KES {value.toLocaleString()}
      </p>
      {note}
    </div>
  );
}

/**
 * Three separate figures: the plan, the consumption and the money kept.
 * Nothing here is netted into an anonymous balance.
 */
export default function MonthFigures({ allocated = 0, spent = 0, moved = 0, movedLines = [], cashLeft = 0 }) {
  const shown = movedLines.slice(0, 3);
  const hidden = movedLines.length - shown.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Figure
          label="Allocated"
          value={allocated}
          icon={PiggyBank}
          tone="text-primary"
          note={<p className="mt-1 text-xs text-muted-foreground">Active monthly plan</p>}
        />
        <Figure
          label="Spent"
          value={spent}
          icon={Receipt}
          tone="text-money-out"
          valueTone="text-money-out"
          note={<p className="mt-1 text-xs text-muted-foreground">Consumption only</p>}
        />
        <Figure
          label="Moved to savings"
          value={moved}
          icon={Landmark}
          tone="text-money-moved"
          valueTone="text-money-moved"
          note={(
            <div className="mt-1 space-y-0.5">
              {shown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No transfers this month</p>
              ) : (
                shown.map((line) => (
                  <p key={line.name} className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{line.name}</span>
                    <span className="tabular-nums text-money-moved">KES {line.amount.toLocaleString()}</span>
                  </p>
                ))
              )}
              {hidden > 0 && <p className="text-xs text-muted-foreground">+{hidden} more</p>}
            </div>
          )}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Allocated is the plan, spent is consumption, moved is what you kept.
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <Wallet className={`h-4 w-4 ${cashLeft < 0 ? 'text-money-out' : 'text-money-in'}`} aria-hidden="true" />
        <span className="text-sm text-foreground">Cash left this month</span>
        <span className={`text-sm font-semibold tabular-nums ${cashLeft < 0 ? 'text-money-out' : 'text-money-in'}`}>
          KES {cashLeft.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          Money in, less spending, less transfers. Goods bought on credit count as spending but never left the Wallet, so they are not in this figure.
        </span>
      </div>
    </div>
  );
}