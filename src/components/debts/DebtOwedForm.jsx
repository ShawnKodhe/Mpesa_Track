import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DebtOwedForm({ open, onClose, onSubmit, editingDebt }) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      debtor: '',
      original_amount: '',
      balance: '',
      due_date: '',
      status: 'outstanding',
      description: '',
    },
  });

  useEffect(() => {
    if (editingDebt) {
      setValue('debtor', editingDebt.debtor || '');
      setValue('original_amount', editingDebt.original_amount || '');
      setValue('balance', editingDebt.balance || '');
      setValue('due_date', (editingDebt.due_date || '').slice(0, 10));
      setValue('status', editingDebt.status || 'outstanding');
      setValue('description', editingDebt.description || '');
    } else {
      reset();
    }
  }, [editingDebt, setValue, reset]);

  const status = watch('status');

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      original_amount: Number(data.original_amount),
      balance: Number(data.balance),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDebt ? 'Edit Debt' : 'Add Debt Owed to You'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debtor">Who owes you?</Label>
            <Input id="debtor" placeholder="Name, phone, or nickname..." {...register('debtor', { required: 'Debtor name is required' })} />
            {errors.debtor && <p className="text-xs text-destructive">{errors.debtor.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="original_amount">Total Owed (KES)</Label>
              <Input id="original_amount" type="number" step="0.01" {...register('original_amount', { required: 'Total amount is required', min: 0 })} />
              {errors.original_amount && <p className="text-xs text-destructive">{errors.original_amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Remaining (KES)</Label>
              <Input id="balance" type="number" step="0.01" {...register('balance', { required: 'Remaining balance is required', min: 0 })} />
              {errors.balance && <p className="text-xs text-destructive">{errors.balance.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input id="due_date" type="date" {...register('due_date')} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} placeholder="Optional notes..." {...register('description')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1">{editingDebt ? 'Save Changes' : 'Add Debt'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}