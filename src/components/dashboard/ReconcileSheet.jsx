import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { kes } from '@/lib/wallet';
import { ledgerTodayKey } from '@/lib/ledgerDates';

const FIELDS = [
  { key: 'mpesa', label: 'M-PESA', column: 'mpesa_balance' },
  { key: 'mmf', label: 'Britam MMF', column: 'mmf_balance' },
  { key: 'mshwari', label: 'M-Shwari', column: 'mshwari_balance' },
  { key: 'cash', label: 'Cash', column: 'other_cash' },
];

const EMPTY = { mpesa: '', mmf: '', mshwari: '', cash: '' };

export default function ReconcileSheet({ open, onOpenChange, wallet }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(EMPTY);
  const [alsoAdjust, setAlsoAdjust] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const today = ledgerTodayKey();
  const actual = FIELDS.reduce((total, field) => total + (Number(values[field.key]) || 0), 0);
  const expected = wallet.wallet;
  const difference = expected - actual;
  const drift = Math.abs(difference) > 100;
  const note = FIELDS.map((field) => `${field.label} ${Number(values[field.key]) || 0}`).join(' · ');

  const reset = () => {
    setValues(EMPTY);
    setMessage('');
    setError('');
    setSaving('');
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet-snapshots'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const saveSnapshot = async () => {
    setError('');
    setSaving('snapshot');
    try {
      await api.entities.WalletSnapshot.create({
        snapshot_date: today,
        mpesa_balance: Number(values.mpesa) || 0,
        mmf_balance: Number(values.mmf) || 0,
        mshwari_balance: Number(values.mshwari) || 0,
        other_cash: Number(values.cash) || 0,
        total: actual,
        note,
      });
      invalidate();
      setMessage('Snapshot saved. It becomes the opening balance from next month.');
    } catch (e) {
      setError(e?.message || 'The snapshot could not be saved.');
    } finally {
      setSaving('');
    }
  };

  const recordAdjustment = async () => {
    setError('');
    setSaving('adjustment');
    try {
      let adjustmentId = '';
      if (alsoAdjust && difference !== 0) {
        const created = await api.entities.Transaction.create({
          type: 'adjustment',
          amount: -difference,
          category: 'reconciliation',
          recipient: 'Wallet',
          description: note,
          transaction_date: today,
        });
        adjustmentId = created.id;
      }
      await api.entities.Reconciliation.create({
        recon_date: today,
        account: 'Other',
        expected,
        actual,
        difference,
        adjustment_transaction_id: adjustmentId,
        note,
      });
      invalidate();
      setMessage(adjustmentId
        ? 'Reconciliation saved and the ledger corrected to match reality.'
        : 'Reconciliation saved.');
    } catch (e) {
      setError(e.message || 'That did not save.');
    } finally {
      setSaving('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading">Reconcile the wallet</DialogTitle>
          <DialogDescription>Count each pocket, then compare it with the ledger.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`recon-${field.key}`}>{field.label}</Label>
              <Input
                id={`recon-${field.key}`}
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={values[field.key]}
                onChange={(e) => { setValues((v) => ({ ...v, [field.key]: e.target.value })); setMessage(''); }}
                className="tabular-nums"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
          {!wallet.openingSet && (
            <p className="text-xs text-muted-foreground">Opening balance not set</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Ledger expects</span>
            <span className="font-semibold tabular-nums">{kes(expected)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">You counted</span>
            <span className="font-semibold tabular-nums">{kes(actual)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
            <span className="text-muted-foreground">Difference</span>
            <span className={`font-heading font-bold tabular-nums ${drift ? 'text-money-out' : 'text-foreground'}`}>
              {kes(difference)}
            </span>
          </div>
          <p className={`text-xs ${drift ? 'text-money-out' : 'text-muted-foreground'}`}>
            {difference === 0
              ? 'The ledger matches reality exactly.'
              : `The ledger is ${kes(Math.abs(difference))} ${difference > 0 ? 'ahead of' : 'behind'} reality.`}
          </p>
        </div>

        <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={alsoAdjust}
            onCheckedChange={(value) => setAlsoAdjust(value === true)}
            className="mt-0.5"
          />
          Also write an adjustment transaction, so the ledger and reality agree.
        </label>

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {message && <p className="mt-2 text-xs text-money-in">{message}</p>}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" disabled={!!saving} onClick={saveSnapshot}>
            {saving === 'snapshot' ? 'Saving...' : 'Save snapshot'}
          </Button>
          <Button className="flex-1" disabled={!!saving} onClick={recordAdjustment}>
            {saving === 'adjustment' ? 'Saving...' : 'Record adjustment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}