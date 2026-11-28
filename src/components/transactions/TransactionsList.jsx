import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CreditCard, Smartphone, Banknote, Wallet, Trash2, HandCoins, Scale, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import { isTransfer, transferDestination } from '@/lib/transfers';
import { directionOf } from '@/lib/moneyTone';
import Amount from '@/components/shared/Amount';

const typeConfig = {
  sent: { icon: ArrowUpRight, color: 'text-money-out', bg: 'bg-money-out/10', label: 'Sent' },
  received: { icon: ArrowDownLeft, color: 'text-money-in', bg: 'bg-money-in/10', label: 'Received' },
  payment: { icon: CreditCard, color: 'text-money-out', bg: 'bg-money-out/10', label: 'Payment' },
  withdrawal: { icon: Banknote, color: 'text-money-out', bg: 'bg-money-out/10', label: 'Withdrawal' },
  deposit: { icon: Wallet, color: 'text-money-in', bg: 'bg-money-in/10', label: 'Deposit' },
  airtime: { icon: Smartphone, color: 'text-money-out', bg: 'bg-money-out/10', label: 'Airtime' },
  transfer: { icon: ArrowLeftRight, color: 'text-money-moved', bg: 'bg-money-moved/10', label: 'Transfer' },
  credit_purchase: { icon: ShoppingBag, color: 'text-muted-foreground', bg: 'bg-secondary', label: 'On credit' },
  loan: { icon: HandCoins, color: 'text-money-in', bg: 'bg-money-in/10', label: 'Loan draw' },
  adjustment: { icon: Scale, color: 'text-foreground', bg: 'bg-secondary', label: 'Adjustment' },
};

export default function TransactionsList({ transactions, onDelete }) {
  const sorted = [...transactions].sort((a, b) => {
    const dateDiff = new Date(b.transaction_date) - new Date(a.transaction_date);
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No transactions yet. Add your first M-Pesa transaction!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-zebra>
      <AnimatePresence>
        {sorted.map((t) => {
          const transfer = isTransfer(t);
          const config = transfer ? typeConfig.transfer : (typeConfig[t.type] || typeConfig.sent);
          const Icon = config.icon;
          const direction = t.type === 'adjustment'
            ? (t.amount < 0 ? 'out' : 'in')
            : directionOf(t);
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-sm transition-all"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {transfer ? transferDestination(t) : (t.recipient || config.label)}
                  </p>
                  <Badge variant="secondary" className="text-xs capitalize hidden sm:inline-flex">
                    {transfer ? 'Transfer' : t.category?.replace(/_/g, ' ')}
                  </Badge>
                  {t.type === 'credit_purchase' && (
                    <Badge
                      variant="outline"
                      className="hidden border-border text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex"
                    >
                      On credit
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">
                    {t.transaction_date ? format(new Date(t.transaction_date), 'MMM d, yyyy') : ''}
                  </p>
                  {t.mpesa_ref && (
                    <span className="text-xs text-muted-foreground">• {t.mpesa_ref}</span>
                  )}
                </div>
                {t.warning && (
                  <p className="mt-1 text-xs text-money-out">{t.warning}</p>
                )}
              </div>
              <Amount
                value={t.amount}
                direction={direction}
                signed
                label={transfer ? 'moved to reserves' : (t.type === 'adjustment' ? 'wallet correction' : undefined)}
                className="text-sm shrink-0"
              />
              <ConfirmDelete
                title="Delete this transaction?"
                description={`${t.recipient || config.label} · KES ${(t.amount || 0).toLocaleString()} will be removed. This cannot be undone.`}
                onConfirm={() => onDelete(t.id)}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete transaction">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                }
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}