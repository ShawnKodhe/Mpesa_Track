import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Calendar, TrendingDown, Banknote } from 'lucide-react';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import { isTradeDebt } from '@/lib/debtKind';

const FREQUENCY_LABELS = {
  one_time: 'One-Time',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
};

function getUpcomingPayments(loan, count = 3) {
  if (!loan.next_payment_date) return [];
  if (loan.frequency === 'one_time') {
    const amount = loan.installment_amount || loan.balance;
    if (!amount) return [];
    return [{ date: new Date(loan.next_payment_date).toISOString().slice(0, 10), amount }];
  }
  if (!loan.installment_amount) return [];
  const payments = [];
  let date = new Date(loan.next_payment_date);
  const interval = loan.frequency === 'weekly' ? 7 : loan.frequency === 'biweekly' ? 14 : 30;
  for (let i = 0; i < count; i++) {
    const d = new Date(date);
    payments.push({
      date: d.toISOString().slice(0, 10),
      amount: loan.installment_amount,
    });
    date.setDate(date.getDate() + interval);
  }
  return payments;
}

export default function LoanCard({ loan, onEdit, onDelete, onRepay }) {
  const progress = loan.principal > 0 ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100) : 0;
  const upcoming = getUpcomingPayments(loan);
  const isActive = loan.status === 'active';

  return (
    <Card className="p-5 border-border space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-foreground truncate">{loan.lender}</h3>
            <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-primary text-primary-foreground' : ''}>
              {isActive ? 'Active' : 'Settled'}
            </Badge>
            {isTradeDebt(loan) && (
              <Badge variant="outline" className="border-border text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Goods on credit
              </Badge>
            )}
          </div>
          {loan.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{loan.description}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(loan)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <ConfirmDelete
            title="Delete this loan?"
            description={`The ${loan.lender} loan and its repayment schedule will be removed. This cannot be undone.`}
            onConfirm={() => onDelete(loan.id)}
            trigger={
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete loan">
                <Trash2 className="w-4 h-4" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-right font-heading text-lg font-bold tabular-nums text-money-out">KES {(loan.balance || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Principal</p>
          <p className="text-sm font-medium text-foreground">KES {(loan.principal || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{loan.frequency === 'one_time' ? 'Repayment' : 'Installment'}</p>
          <p className="text-right text-sm font-medium tabular-nums text-money-out">
            KES {(loan.installment_amount || (loan.frequency === 'one_time' ? loan.balance : 0) || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Repaid: {progress}%</span>
          <span className="text-muted-foreground">{FREQUENCY_LABELS[loan.frequency] || loan.frequency}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      {isActive && onRepay && (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => onRepay(loan)}>
          <Banknote className="w-4 h-4" /> Repay
        </Button>
      )}

      {loan.interest_rate > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Interest: {loan.interest_rate}% p.a.</span>
        </div>
      )}

      {isActive && upcoming.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {loan.frequency === 'one_time' ? 'Scheduled Repayment' : 'Upcoming Repayments'}
          </p>
          <div className="space-y-1.5">
            {upcoming.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(p.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <span className="font-medium tabular-nums text-money-out">KES {p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}