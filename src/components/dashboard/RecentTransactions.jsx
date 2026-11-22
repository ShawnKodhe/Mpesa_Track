import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CreditCard, Smartphone, Banknote, Wallet, HandCoins, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
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
};

export default function RecentTransactions({ transactions }) {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, 6);

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground mt-1">Your latest M-Pesa activity</p>
        </div>
        <Link to="/transactions" className="text-sm text-primary font-medium hover:underline">
          View all
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3">
          {recent.map((t) => {
            const transfer = isTransfer(t);
            const config = transfer ? typeConfig.transfer : (typeConfig[t.type] || typeConfig.sent);
            const Icon = config.icon;
            const direction = directionOf(t);
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {transfer ? transferDestination(t) : (t.recipient || config.label)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transfer ? 'Transfer · ' : ''}
                    {t.type === 'credit_purchase' ? 'On credit · ' : ''}
                    {t.transaction_date ? format(new Date(t.transaction_date), 'MMM d, yyyy') : ''}
                  </p>
                </div>
                <Amount
                  value={t.amount}
                  direction={direction}
                  signed
                  label={transfer ? 'moved to savings' : undefined}
                  className="text-sm shrink-0"
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}