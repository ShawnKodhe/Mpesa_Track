import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Calendar } from 'lucide-react';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import { ledgerDateKey, ledgerTodayKey } from '@/lib/ledgerDates';

export default function DebtOwedCard({ debt, onEdit, onDelete }) {
  const progress = debt.original_amount > 0 ? Math.round(((debt.original_amount - debt.balance) / debt.original_amount) * 100) : 0;
  const isOutstanding = debt.status === 'outstanding';
  const isOverdue = isOutstanding && debt.due_date && ledgerDateKey(debt.due_date) < ledgerTodayKey();

  return (
    <Card className="p-5 border-border space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-semibold text-foreground truncate">{debt.debtor}</h3>
            <Badge variant={isOutstanding ? 'default' : 'secondary'} className={isOutstanding ? 'bg-primary text-primary-foreground' : ''}>
              {isOutstanding ? 'Outstanding' : 'Settled'}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
          {debt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{debt.description}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(debt)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <ConfirmDelete
            title="Delete this debt?"
            description={`${debt.debtor} · KES ${(debt.balance || 0).toLocaleString()} will be removed from your tracked debts. This cannot be undone.`}
            onConfirm={() => onDelete(debt.id)}
            trigger={
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete debt">
                <Trash2 className="w-4 h-4" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-right font-heading text-lg font-bold tabular-nums text-money-in">KES {(debt.balance || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Owed</p>
          <p className="text-sm font-medium text-foreground">KES {(debt.original_amount || 0).toLocaleString()}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Collected: {progress}%</span>
          {debt.due_date && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(debt.due_date.slice(0, 10)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
    </Card>
  );
}