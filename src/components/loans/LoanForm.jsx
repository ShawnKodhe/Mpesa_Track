import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEBT_KINDS } from '@/lib/debtKind';

export default function LoanForm({ open, onClose, onSubmit, editingLoan }) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      lender: '',
      principal: '',
      balance: '',
      interest_rate: '',
      installment_amount: '',
      next_payment_date: '',
      frequency: 'monthly',
      status: 'active',
      debt_type: 'cash_loan',
      description: '',
    },
  });

  useEffect(() => {
    if (editingLoan) {
      setValue('lender', editingLoan.lender || '');
      setValue('principal', editingLoan.principal || '');
      setValue('balance', editingLoan.balance || '');
      setValue('interest_rate', editingLoan.interest_rate || '');
      setValue('installment_amount', editingLoan.installment_amount || '');
      setValue('next_payment_date', (editingLoan.next_payment_date || '').slice(0, 10));
      setValue('frequency', editingLoan.frequency || 'monthly');
      setValue('status', editingLoan.status || 'active');
      setValue('debt_type', editingLoan.debt_type || 'cash_loan');
      setValue('description', editingLoan.description || '');
    } else {
      reset();
    }
  }, [editingLoan, setValue, reset]);

  const frequency = watch('frequency');
  const status = watch('status');
  const debtType = watch('debt_type');

  const handleFormSubmit = (data) => {
    const balance = Number(data.balance);
    const installment = data.installment_amount
      ? Number(data.installment_amount)
      : (data.frequency === 'one_time' ? balance : 0);
    onSubmit({
      ...data,
      debt_type: debtType || 'cash_loan',
      principal: Number(data.principal),
      balance,
      interest_rate: data.interest_rate ? Number(data.interest_rate) : 0,
      installment_amount: installment,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLoan ? 'Edit Loan' : 'Add Loan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lender">Lender</Label>
            <Input id="lender" placeholder="Bank, SACCO, person..." {...register('lender', { required: 'Lender is required' })} />
            {errors.lender && <p className="text-xs text-destructive">{errors.lender.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Kind of debt</Label>
            <Select value={debtType} onValueChange={(v) => setValue('debt_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEBT_KINDS.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>{kind.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {debtType === 'trade_debt' && (
              <p className="text-xs text-muted-foreground">
                Goods or services received and not yet paid for. Nothing is added to the Wallet.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="principal">{debtType === 'trade_debt' ? 'Goods value (KES)' : 'Principal (KES)'}</Label>
              <Input id="principal" type="number" step="0.01" {...register('principal', { required: 'Principal is required', min: 0 })} />
              {errors.principal && <p className="text-xs text-destructive">{errors.principal.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Balance (KES)</Label>
              <Input id="balance" type="number" step="0.01" {...register('balance', { required: 'Balance is required', min: 0 })} />
              {errors.balance && <p className="text-xs text-destructive">{errors.balance.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Interest Rate (%)</Label>
              <Input id="interest_rate" type="number" step="0.01" placeholder="e.g. 14.5" {...register('interest_rate', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installment_amount">{frequency === 'one_time' ? 'Repayment (KES)' : 'Installment (KES)'}</Label>
              <Input id="installment_amount" type="number" step="0.01" {...register('installment_amount', { min: 0 })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_payment_date">{frequency === 'one_time' ? 'Repayment Date' : 'Next Payment Date'}</Label>
            <Input id="next_payment_date" type="date" {...register('next_payment_date', { required: 'Next payment date is required' })} />
            {errors.next_payment_date && <p className="text-xs text-destructive">{errors.next_payment_date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setValue('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-Time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} placeholder="Optional notes..." {...register('description')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1">{editingLoan ? 'Save Changes' : 'Add Loan'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}