import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ledgerTodayKey } from '@/lib/ledgerDates';
import { useState } from 'react';

/** Records a repayment as two records: principal (not spending) and interest (spending). */
export default function RepayForm({ open, onClose, loan, onSubmit, submitting = false }) {
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('');
  const [date, setDate] = useState(ledgerTodayKey());
  const [error, setError] = useState('');

  const reset = () => {
    setPrincipal('');
    setInterest('');
    setDate(ledgerTodayKey());
    setError('');
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onClose();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const principalValue = Number(principal) || 0;
    const interestValue = Number(interest) || 0;
    if (principalValue < 0 || interestValue < 0) {
      setError('Amounts cannot be negative.');
      return;
    }
    if (principalValue <= 0 && interestValue <= 0) {
      setError('Enter a principal or an interest amount.');
      return;
    }
    setError('');
    onSubmit({
      loanId: loan.id,
      principal: principalValue,
      interest: interestValue,
      transactionDate: date,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading">Repay {loan?.lender || 'loan'}</DialogTitle>
          <DialogDescription>
            Principal reduces the balance. Interest and fees are spending. Both are written in one go.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="repay-principal">Principal (KES)</Label>
            <Input
              id="repay-principal"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repay-interest">Interest and fees (KES)</Label>
            <Input
              id="repay-interest"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={interest}
              onChange={(event) => setInterest(event.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repay-date">Date</Label>
            <Input id="repay-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>

          <Card className="border-border bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">
              Balance now KES {(loan?.balance || 0).toLocaleString()}. A principal larger than the balance is
              capped there and the excess is flagged on the transaction.
            </p>
          </Card>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : 'Record repayment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}