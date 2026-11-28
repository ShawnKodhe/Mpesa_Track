import { useState } from 'react';
import { ledgerTodayKey } from '@/lib/ledgerDates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DEFAULT_CATEGORIES = [
  'food',
  'transport',
  'utilities',
  'rent',
  'entertainment',
  'health',
  'education',
  'reserves',
  'airtime',
  'shopping',
  'family',
  'business',
  'other',
  'loan principal',
  'loan interest',
];

const TYPES = [
  { value: 'sent', label: 'Sent Money' },
  { value: 'received', label: 'Received Money' },
  { value: 'payment', label: 'Payment (Buy Goods/Paybill)' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'airtime', label: 'Airtime Purchase' },
  { value: 'transfer', label: 'Transfer (own pocket / Ladder)' },
  { value: 'credit_purchase', label: 'Goods on credit (no cash moved)' },
  { value: 'loan', label: 'Loan draw (money borrowed in)' },
];

const FIELDS = ['type', 'amount', 'recipient', 'category', 'transaction_date', 'mpesa_ref', 'description'];

function getProgress(form) {
  const filled = FIELDS.filter(f => form[f] !== '' && form[f] !== null && form[f] !== undefined).length;
  return Math.round((filled / FIELDS.length) * 100);
}

export default function TransactionForm({ open, onClose, onSubmit, budgetCategories = [] }) {
  const [form, setForm] = useState({
    type: 'payment',
    amount: '',
    recipient: '',
    category: 'other',
    description: '',
    transaction_date: ledgerTodayKey(),
    mpesa_ref: '',
  });

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...budgetCategories]));

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = form.category.trim();
    if (!trimmed) return;
    onSubmit({ ...form, category: trimmed, amount: parseFloat(form.amount) });
    setForm({
      type: 'payment',
      amount: '',
      recipient: '',
      category: 'other',
      description: '',
      transaction_date: ledgerTodayKey(),
      mpesa_ref: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Transaction</DialogTitle>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Form completion</span>
              <span>{getProgress(form)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${getProgress(form)}%` }}
              />
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recipient / Source</Label>
            <Input placeholder="e.g. Safaricom, John Doe" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                list="transaction-category-suggestions"
                placeholder="Type or select a category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
              <datalist id="transaction-category-suggestions">
                {allCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>M-Pesa Ref (optional)</Label>
            <Input placeholder="e.g. SLK4H7J9KQ" value={form.mpesa_ref} onChange={(e) => setForm({ ...form, mpesa_ref: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input placeholder="What was this for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">Add Transaction</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}