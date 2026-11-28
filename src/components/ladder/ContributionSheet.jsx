import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { todayISO, fmtKES } from '@/lib/ladder';

export default function ContributionSheet({ open, onOpenChange, rung, onSubmit, saving, buffer = false, withdrawalDates }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && rung) {
      setAmount(String(rung.monthly_contribution || ''));
      setDate(todayISO());
      setNote('');
    }
  }, [open, rung]);

  const value = Number(amount);
  const valid = value > 0;
  const sameDayWithdrawal = buffer && withdrawalDates ? withdrawalDates.has(date) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Add contribution</SheetTitle>
          <SheetDescription>
            {rung ? `${rung.name} · planned ${fmtKES(rung.monthly_contribution)} a month` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-4">
          {buffer && (
            <p className="rounded-xl border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
              One pot, five depths. This adds to the shared buffer balance, so every checkpoint on the buffer climb moves with it.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="contribution-amount">Amount (KES)</Label>
            <Input
              id="contribution-amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contribution-date">Date</Label>
            <Input
              id="contribution-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {sameDayWithdrawal && (
            <div className="flex gap-2 rounded-xl border border-debt/40 bg-debt/10 p-3 text-xs leading-5 text-debt">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You logged a withdrawal from the buffer on this date. Adding a contribution now adds to the same pot, it does not undo the withdrawal.
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="contribution-note">Note</Label>
            <Textarea
              id="contribution-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
          <Button
            className="w-full"
            disabled={!valid || saving}
            onClick={() => onSubmit({ amount: value, date, note: note.trim() })}
          >
            {saving ? 'Reserving…' : 'Reserve contribution'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}