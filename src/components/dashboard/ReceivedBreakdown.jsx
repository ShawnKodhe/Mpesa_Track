import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { kes } from '@/lib/wallet';
import { formatLedgerDayShort, ledgerDateKey } from '@/lib/ledgerDates';
import { receiptsNewestFirst } from '@/lib/received';

/** Every receipt in the month, newest first. Each amount is money in, so green. */
export default function ReceivedBreakdown({ open, onOpenChange, receipts = [], monthLabel }) {
  const rows = receiptsNewestFirst(receipts);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-card">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-foreground">Money received</SheetTitle>
          <SheetDescription>
            {monthLabel} · {rows.length === 1 ? '1 receipt' : `${rows.length} receipts`}, newest first
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 divide-y divide-border">
          {rows.map((receipt) => (
            <div key={receipt.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {receipt.category || 'Uncategorised'}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatLedgerDayShort(ledgerDateKey(receipt.transaction_date))}
                  {receipt.recipient ? ` · ${receipt.recipient}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-money-in">
                {kes(receipt.amount)}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing received this month.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}