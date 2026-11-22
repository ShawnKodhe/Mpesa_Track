import { ArrowLeftRight, AlertTriangle, Check, HandCoins, PiggyBank, TrendingUp, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTION_META = {
  create_transaction: { label: 'New transaction', Icon: ArrowLeftRight },
  update_transaction: { label: 'Edit transaction', Icon: ArrowLeftRight },
  delete_transaction: { label: 'Delete transaction', Icon: Trash2 },
  update_budget: { label: 'Budget change', Icon: PiggyBank },
  create_contribution: { label: 'Ladder contribution', Icon: TrendingUp },
  create_loan: { label: 'New loan', Icon: HandCoins },
  update_loan: { label: 'Loan change', Icon: HandCoins },
  create_receivable: { label: 'New receivable', Icon: Wallet },
  update_receivable: { label: 'Receivable change', Icon: Wallet },
};

export default function JarvisActionCard({ action, onConfirm, onCancel }) {
  const meta = ACTION_META[action.type] || { label: 'Change', Icon: ArrowLeftRight };
  const { Icon } = meta;

  if (action.status !== 'pending' && action.status !== 'running') {
    const failed = action.status === 'failed';
    const cancelled = action.status === 'cancelled';
    return (
      <div
        className={`jarvis-msg flex max-w-[92%] items-center gap-2 rounded-[14px] border px-3 py-2 text-xs ${
          failed ? 'border-destructive/40 text-destructive' : cancelled ? 'border-border text-muted-foreground' : 'border-inflow/30 text-foreground'
        }`}
      >
        {failed ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          : cancelled ? <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            : <Check className="h-3.5 w-3.5 text-money-in" aria-hidden="true" />}
        <span className="tabular-nums">{cancelled ? 'Cancelled, sir.' : action.receipt}</span>
      </div>
    );
  }

  return (
    <div className="jarvis-msg w-full max-w-[92%] rounded-[14px] border border-primary/35 bg-card p-3 shadow-card">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</p>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Needs confirming</span>
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">{action.summary}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={action.status === 'running'}
          className="h-11 px-4 text-sm sm:h-9"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={action.status === 'running'}
          className="h-11 px-5 text-sm sm:h-9"
        >
          {action.status === 'running' ? 'Working' : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}