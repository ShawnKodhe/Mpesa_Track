import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TYPE_META } from '@/lib/ladderData';

export default function RungForm({ open, onOpenChange, rung, onSave, saving }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(rung ? {
      name: rung.name || '',
      target_amount: rung.target_amount || 0,
      monthly_contribution: rung.monthly_contribution || 0,
      target_date: (rung.target_date || '').slice(0, 10),
      category_label: rung.category_label || '',
      notes: rung.notes || '',
      type: rung.type || 'buffer',
    } : {
      name: '',
      target_amount: 0,
      monthly_contribution: 0,
      target_date: '',
      category_label: '',
      notes: '',
      type: 'buffer',
    });
  }, [open, rung]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rung ? 'Edit rung' : 'Add a rung'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rung-type">Type</Label>
            <Select value={form.type || 'buffer'} onValueChange={(value) => set('type', value)}>
              <SelectTrigger id="rung-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rung-name">Name</Label>
            <Input id="rung-name" value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rung-target">Target (KES)</Label>
              <Input
                id="rung-target"
                type="number"
                value={form.target_amount ?? ''}
                onChange={(e) => set('target_amount', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rung-monthly">Monthly (KES)</Label>
              <Input
                id="rung-monthly"
                type="number"
                value={form.monthly_contribution ?? ''}
                onChange={(e) => set('monthly_contribution', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rung-deadline">Deadline</Label>
            <Input
              id="rung-deadline"
              type="date"
              value={form.target_date || ''}
              onChange={(e) => set('target_date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rung-category">Budget category</Label>
            <Input
              id="rung-category"
              value={form.category_label || ''}
              onChange={(e) => set('category_label', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rung-notes">Notes</Label>
            <Textarea
              id="rung-notes"
              rows={2}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={saving || !form.name?.trim()} onClick={() => onSave(form)}>
            {saving ? 'Saving…' : rung ? 'Save rung' : 'Add rung'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}