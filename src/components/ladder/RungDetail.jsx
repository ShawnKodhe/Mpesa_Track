import { motion } from 'framer-motion';
import { Check, Plus, Pencil, AlertTriangle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProgressRing from './ProgressRing';
import LiquidityBadge from './LiquidityBadge';
import { TYPE_META } from '@/lib/ladderData';
import { liquidityOf } from '@/lib/liquidity';
import { isBufferRung } from '@/lib/ladderBuffer';

const RING_COLOR = {
  buffer: 'hsl(var(--status-buffer))',
  debt: 'hsl(var(--status-debt))',
  investment: 'hsl(var(--status-invest))',
};
import { fmtKES, fmtDate, rungPct, daysUntil, isOnTrack, isRungComplete } from '@/lib/ladder';

export default function RungDetail({ rung, contributions, monthContributed, budgetAmount, onAdd, onEdit }) {
  const meta = TYPE_META[rung.type] || TYPE_META.buffer;
  const pct = rungPct(rung);
  const remaining = Math.max(0, (rung.target_amount || 0) - (rung.current_amount || 0));
  const days = daysUntil(rung.target_date);
  const complete = isRungComplete(rung);
  const onTrack = isOnTrack(rung);
  const budgetPct = budgetAmount > 0 ? Math.min(100, (monthContributed / budgetAmount) * 100) : 0;
  const buffer = isBufferRung(rung);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="overflow-hidden pl-8 pt-2"
    >
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={pct} color={complete ? 'hsl(var(--status-inflow))' : RING_COLOR[rung.type] || RING_COLOR.buffer}>
            <span className="text-base font-heading font-bold text-foreground">{Math.round(pct)}%</span>
            <span className="text-xs text-muted-foreground">reserved</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-right font-heading text-lg font-bold tabular-nums leading-tight text-money-moved">{fmtKES(rung.current_amount)}</p>
            <p className="text-xs text-muted-foreground">of {fmtKES(rung.target_amount)} · {fmtKES(remaining)} left</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  complete || onTrack
                    ? 'bg-inflow/10 text-inflow'
                    : 'bg-debt/10 text-debt'
                }`}
              >
                {complete || onTrack ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {complete ? 'Complete' : onTrack ? 'On track' : 'Behind pace'}
              </span>
              <LiquidityBadge value={liquidityOf(rung)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <p className="text-muted-foreground">Monthly</p>
            <p className="font-semibold text-foreground">{fmtKES(rung.monthly_contribution)}</p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <p className="text-muted-foreground">Deadline</p>
            <p className="font-semibold text-foreground">{fmtDate(rung.target_date)}</p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <p className="text-muted-foreground">Days left</p>
            <p className="font-semibold text-foreground">{days === null ? '—' : days < 0 ? 'Past due' : `${days}`}</p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <p className="text-muted-foreground">Category</p>
            <p className="font-semibold text-foreground truncate">{rung.category_label || '—'}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>This month vs budget</span>
            <span>{fmtKES(monthContributed)} / {fmtKES(budgetAmount)}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${meta.bar} transition-all duration-700`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        {rung.advantages?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-1.5">What this rung buys</p>
            <ul className="space-y-1">
              {rung.advantages.map((advantage) => (
                <li key={advantage} className="flex gap-2 text-xs text-muted-foreground">
                  <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${meta.text}`} />
                  <span>{advantage}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className={`text-xs font-semibold text-foreground ${buffer ? '' : 'mb-1.5'}`}>{buffer ? 'Buffer contributions' : 'Contributions'}</p>
          {buffer && (
            <p className="mb-1.5 text-[11px] leading-4 text-muted-foreground">
              Every contribution into the one buffer pot, counted once.
            </p>
          )}
          {contributions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No contributions yet.</p>
          ) : (
            <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {contributions.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3" />
                    {fmtDate(c.contribution_date)}
                  </span>
                  <span className="font-medium tabular-nums text-money-moved">{fmtKES(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5" onClick={onAdd}>
            <Plus className="w-3.5 h-3.5" /> Add contribution
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit rung
          </Button>
        </div>
      </div>
    </motion.div>
  );
}