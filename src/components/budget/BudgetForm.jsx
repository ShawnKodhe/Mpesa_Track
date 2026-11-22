import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SUGGESTED_CATEGORIES = [
  'food',
  'transport',
  'utilities',
  'rent',
  'entertainment',
  'health',
  'education',
  'savings',
  'airtime',
  'shopping',
  'family',
  'business',
  'other',
];

const EMPTY = { category: '', amount: '', period: 'monthly', is_necessity: false };

export default function BudgetForm({ open, onClose, onSubmit, existingCategories = [], editingBudget = null }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editingBudget) {
      setForm({
        category: editingBudget.category || '',
        amount: editingBudget.amount != null ? String(editingBudget.amount) : '',
        period: editingBudget.period || 'monthly',
        is_necessity: !!editingBudget.is_necessity,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editingBudget, open]);

  // When editing, the budget's own category should remain available in suggestions
  const otherCategories = existingCategories.filter(c => c !== editingBudget?.category);
  const suggestions = SUGGESTED_CATEGORIES.filter(c => !otherCategories.includes(c));

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = form.category.trim();
    if (!trimmed) return;
    onSubmit({ ...form, category: trimmed, amount: parseFloat(form.amount) });
    setForm(EMPTY);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{editingBudget ? 'Edit Budget' : 'Set Budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              list="budget-category-suggestions"
              placeholder="Type or select a category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <datalist id="budget-category-suggestions">
              {suggestions.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>Amount (KES)</Label>
            <Input type="number" placeholder="e.g. 5000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between py-2 px-1">
            <div>
              <Label className="text-sm font-medium">Necessity</Label>
              <p className="text-xs text-muted-foreground">Mark as essential spending</p>
            </div>
            <Switch checked={form.is_necessity} onCheckedChange={(v) => setForm({ ...form, is_necessity: v })} />
          </div>
          <Button type="submit" className="w-full" disabled={!form.category || !form.amount}>
            {editingBudget ? 'Save Changes' : 'Create Budget'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}