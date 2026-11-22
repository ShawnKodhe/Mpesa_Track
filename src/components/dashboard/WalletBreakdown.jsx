import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { kes, legAmount, walletLegs, walletTone } from '@/lib/wallet';

export default function WalletBreakdown({ open, onOpenChange, wallet }) {
  const legs = walletLegs(wallet);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-card">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-foreground">Wallet breakdown</SheetTitle>
          <SheetDescription>{wallet.monthLabel} · recomputed from your records every time</SheetDescription>
        </SheetHeader>

        <div className="mt-5 divide-y divide-border">
          {legs.map((leg) => (
            <div key={leg.key} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{leg.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {leg.key === 'openingBalance' && !wallet.openingSet
                    ? 'Opening balance not set. Save a snapshot to carry a real balance forward.'
                    : leg.note}
                </p>
              </div>
              <span className={`shrink-0 text-right text-sm font-semibold tabular-nums ${leg.tone}`}>
                {legAmount(leg)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Wallet</span>
            <span className={`font-heading font-bold tabular-nums ${walletTone(wallet.wallet)}`}>{kes(wallet.wallet)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Owed out, information only</span>
            <span className="font-heading font-bold tabular-nums text-muted-foreground">{kes(wallet.owedOut)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Free cash</span>
            <span className={`font-heading font-bold tabular-nums ${walletTone(wallet.freeCash)}`}>
              {kes(wallet.freeCash)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Free cash is the Wallet less what you still owe. Owed out is never deducted from the Wallet itself.
          </p>
        </div>

        {wallet.owedOutBeforeCutover > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Owed out includes loans drawn before 19 Nov, which are not in the Wallet.
          </p>
        )}

        <p className="mt-1 pb-2 text-xs text-muted-foreground">
          Savings held in the Ladder are never added to the Wallet, and money owed to you is never counted as cash.
        </p>
      </SheetContent>
    </Sheet>
  );
}