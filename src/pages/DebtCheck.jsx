import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { buildDebtCheck } from '@/lib/debtCheck';
import CashLoanTable from '@/components/debts/CashLoanTable';
import TradeDebtTable from '@/components/debts/TradeDebtTable';

export default function DebtCheck() {
  const { user } = useAuth();

  const { data: loans = [], isLoading: loadingLoans } = useQuery({
    queryKey: ['loans', user?.email],
    queryFn: () => api.entities.Loan.filter({ created_by: user.email }, '-next_payment_date', 500),
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => api.entities.Transaction.filter({ created_by: user.email }, '-transaction_date', 500),
    enabled: !!user,
  });

  const { cashRows, tradeRows, issues } = buildDebtCheck({ loans, transactions });
  const loading = loadingLoans || loadingTransactions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/loans" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Loans
          </Link>
          <h1 className="mt-1 text-2xl font-heading font-bold text-foreground md:text-3xl">Debt check</h1>
          <p className="mt-1 text-muted-foreground">Cash loans and goods on credit, kept apart</p>
        </div>
        <ShieldCheck className="hidden h-8 w-8 text-muted-foreground sm:block" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <CashLoanTable rows={cashRows} />
          <TradeDebtTable rows={tradeRows} />

          <Card className="border-border p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Validation</h3>
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-money-in">
                <CheckCircle2 className="h-4 w-4" />
                No problems found. Every draw has its loan, and every balance matches the ledger.
              </div>
            ) : (
              <ul className="space-y-3">
                {issues.map((issue) => (
                  <li key={issue.key} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-money-out" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{issue.problem}</p>
                      <p className="text-xs text-muted-foreground">{issue.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}