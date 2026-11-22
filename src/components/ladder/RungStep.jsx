import { Check, Lock, Shield } from 'lucide-react';
import { TYPE_META, RUNG_ICON_MAP } from '@/lib/ladderData';
import { fmtKES, rungPct } from '@/lib/ladder';
import { liquidityOf } from '@/lib/liquidity';
import { dateLine, paceLine } from '@/lib/rungDates';
import LiquidityBadge from './LiquidityBadge';

export default function RungStep({ rung, rungs = [], expanded, onToggle }) {
  const meta = TYPE_META[rung.type] || TYPE_META.buffer;
  const complete = rung.status === 'complete';
  const active = rung.status === 'active';
  const Icon = RUNG_ICON_MAP[rung.icon] || Shield;
  const pct = rungPct(rung);
  const dates = dateLine(rung, rungs);
  const pace = active ? paceLine(rung, rungs) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      className="relative block w-full cursor-pointer pl-8 text-left"
    >
      <span
        className={`absolute left-[4px] top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 ${
          complete
            ? 'bg-inflow border-inflow text-background'
            : active
              ? `${meta.dot} border-background`
              : 'bg-secondary border-border'
        }`}
      >
        {complete && <Check className="w-2.5 h-2.5" />}
        {rung.status === 'locked' && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
        {active && <span className={`absolute inset-0 rounded-full ${meta.dot} animate-ping opacity-60`} />}
      </span>

      <div
        className={`rounded-2xl border p-3 transition-all duration-300 ${
          complete
            ? 'border-inflow/40 bg-inflow/5'
            : active
              ? `${meta.border} bg-card shadow-sm`
              : 'border-border bg-card/50 opacity-70'
        } ${expanded ? 'ring-2 ring-primary/25' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-6 h-6 rounded-lg ${meta.soft} ${meta.text}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-foreground truncate">{rung.name}</span>
          <span className="ml-auto text-xs font-bold text-foreground">{Math.round(pct)}%</span>
        </div>

        {dates && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{dates}</p>
        )}
        {pace && (
          <p className="mt-0.5 text-xs font-medium leading-5 text-muted-foreground">{pace}</p>
        )}

        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full ${complete ? 'bg-inflow' : meta.bar} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{fmtKES(rung.current_amount)} of {fmtKES(rung.target_amount)}</span>
        </div>

        <LiquidityBadge value={liquidityOf(rung)} className="mt-1.5" />
      </div>
    </div>
  );
}