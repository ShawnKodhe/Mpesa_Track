import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import WalletDots from './WalletDots';
import { kes, legAmount, walletLegs, walletTone } from '@/lib/wallet';
import { formatLedgerDayShort, ledgerDateKey } from '@/lib/ledgerDates';

/** Counts the figure up once per change, so the first number Shawn sees arrives softly. */
function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }
    let frame;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / 1100, 1);
      setValue(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setValue(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function driftTone(difference) {
  return Math.abs(difference || 0) > 100 ? 'text-money-out' : 'text-muted-foreground';
}

export default function WalletCard({ wallet, reconciliations = [], onOpen, onReconcile }) {
  const animatedWallet = useCountUp(wallet.wallet);
  const animatedFree = useCountUp(wallet.freeCash);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Wallet, open breakdown"
        className="w-full rounded-2xl p-5 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">Wallet</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{wallet.monthLabel}</p>
          </div>
          <WalletDots lit />
        </div>

        <p className={`mt-5 text-right font-heading text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${walletTone(wallet.wallet)}`}>
          {kes(animatedWallet)}
        </p>
        <p className="mt-1 text-right text-xs text-muted-foreground">Spendable this month, reserves held apart</p>

        <div className="mt-4 space-y-1.5 border-t border-border pt-3">
          {walletLegs(wallet).map((leg) => (
            <div key={leg.key} className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">{leg.label}</span>
              <span className={`shrink-0 text-right text-xs font-semibold tabular-nums ${leg.tone}`}>
                {legAmount(leg)}
              </span>
            </div>
          ))}
          {!wallet.openingSet && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Opening balance not set. Save a snapshot to carry a real balance forward.
            </p>
          )}

          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-2">
            <span className="text-xs font-semibold text-foreground">Wallet</span>
            <span className={`shrink-0 text-sm font-bold tabular-nums ${walletTone(wallet.wallet)}`}>
              {kes(animatedWallet)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">Owed out, information only</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              {kes(wallet.owedOut)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">Free cash</span>
            <span className={`shrink-0 text-xs font-bold tabular-nums ${wallet.freeCash < 0 ? 'text-money-out' : 'text-money-in'}`}>
              {kes(animatedFree)}
            </span>
          </div>
        </div>

        {wallet.owedOutBeforeCutover > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Owed out includes loans drawn before 19 Nov, which are not in the Wallet.
          </p>
        )}
        {wallet.owedOutTrade > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Owed out includes {kes(wallet.owedOutTrade)} of goods on credit, which never entered the Wallet.
          </p>
        )}
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5">
        <button
          type="button"
          onClick={onReconcile}
          className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
        >
          Reconcile
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Breakdown <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {reconciliations.length > 0 && (
        <div className="space-y-1.5 border-t border-border px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last reconciliations</p>
          {reconciliations.map((reconciliation) => (
            <div key={reconciliation.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">
                {formatLedgerDayShort(ledgerDateKey(reconciliation.recon_date))}
                {reconciliation.note ? ` · ${reconciliation.note}` : ''}
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${driftTone(reconciliation.difference)}`}>
                {kes(reconciliation.difference)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}