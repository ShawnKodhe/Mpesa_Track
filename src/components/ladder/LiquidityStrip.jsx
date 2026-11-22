import { LIQUIDITY_KEYS, LIQUIDITY_META } from '@/lib/liquidity';
import { liquiditySplit } from '@/lib/ladderBuffer';

const THREE_MONTH_TARGET = 75000;

export default function LiquidityStrip({ rungs }) {
  const split = liquiditySplit(rungs);
  const thin = split.liquid < THREE_MONTH_TARGET;

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
        {LIQUIDITY_KEYS.map((key, index) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            {index > 0 && <span className="text-muted-foreground">·</span>}
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${LIQUIDITY_META[key].dot}`} />
              {LIQUIDITY_META[key].label}
            </span>
            <span className="tabular-nums">{Math.round(split[key]).toLocaleString('en-KE')}</span>
          </span>
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${thin ? 'text-debt' : 'text-buffer'}`}>
        Aim to keep at least three months of essentials liquid at all times.
      </p>
    </div>
  );
}