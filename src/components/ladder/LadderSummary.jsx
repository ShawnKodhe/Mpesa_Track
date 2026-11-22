import { fmtKES, pctOf, daysUntil } from '@/lib/ladder';
import { totalSaved } from '@/lib/ladderBuffer';

function Tile({ label, value, sub, className = '', valueClassName = 'text-xl sm:text-2xl' }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <p className={`font-heading font-bold tabular-nums tracking-tight text-foreground ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function LadderSummary({ rungs, activeRung }) {
  // The buffer pot is one balance held at five depths, so it is counted once.
  const saved = totalSaved(rungs);
  const target = rungs.reduce((sum, r) => sum + (r.target_amount || 0), 0);
  const overall = pctOf(saved, target);
  const days = activeRung ? daysUntil(activeRung.target_date) : null;
  const daysLabel = days === null ? '—' : days < 0 ? 'Past due' : `${days} days`;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-2">
      <div className="col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:row-span-2">
        <p className="text-right font-heading text-3xl font-bold tabular-nums tracking-tight text-money-moved sm:text-4xl">
          {fmtKES(saved)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Total saved</p>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-buffer transition-all duration-700"
            style={{ width: `${overall}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="tabular-nums text-money-moved">{fmtKES(saved)}</span> of {fmtKES(target)} target
        </p>
      </div>

      <Tile label="Total target" value={fmtKES(target)} />
      <Tile label="Overall progress" value={`${Math.round(overall)}%`} />
      <Tile label="Current rung" value={activeRung ? activeRung.name : 'All done'} valueClassName="text-lg sm:text-xl truncate" />
      <Tile
        label="Days left on this rung"
        value={daysLabel}
        valueClassName={`text-xl sm:text-2xl ${days !== null && days < 0 ? 'text-debt' : ''}`}
      />
    </div>
  );
}