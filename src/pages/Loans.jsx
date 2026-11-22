import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, HandCoins, AlertCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoanCard from '@/components/loans/LoanCard';
import LoanForm from '@/components/loans/LoanForm';
import RepayForm from '@/components/loans/RepayForm';
import RepaidFootnote, { repaymentTotals } from '@/components/loans/RepaidFootnote';
import { ledgerTodayKey } from '@/lib/ledgerDates';
import { isThisMonth } from '@/lib/moneyFlows';

export default function Loans() {
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [repayLoan, setRepayLoan] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans', user?.email],
    queryFn: () => api.entities.Loan.filter({ created_by: user.email }, '-next_payment_date', 500),
    enabled: !!user,
  });

  const { data: monthTransactions = [] } = useQuery({
    queryKey: ['loan-repayments-month', user?.email],
    queryFn: () => api.entities.Transaction.filter({ created_by: user.email }, '-transaction_date', 500),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Loan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowForm(false);
      setEditingLoan(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Loan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowForm(false);
      setEditingLoan(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Loan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  });

  const repayMutation = useMutation({
    mutationFn: async ({ loan, principal, interest, transactionDate }) => {
      const response = await api.functions.invoke('loanLedger', {
        action: 'record_repayment',
        loanId: loan.id,
        principal,
        interest,
        transactionDate,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['loan-repayments-month'] });
      setRepayLoan(null);
    },
  });

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setShowForm(true);
  };

  const handleSubmit = (data) => {
    if (editingLoan) {
      updateMutation.mutate({ id: editingLoan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activeLoans = loans.filter(l => l.status === 'active');
  const paidLoans = loans.filter(l => l.status !== 'active');
  const totalBalance = activeLoans.reduce((s, l) => s + (l.balance || 0), 0);

  const today = ledgerTodayKey();
  const upcomingRepayments = activeLoans
    .filter(l => l.next_payment_date && (l.next_payment_date || '').slice(0, 10) >= today)
    .sort((a, b) => (a.next_payment_date || '').localeCompare(b.next_payment_date || ''));

  const { principal: principalRepaid, interest: interestPaid } = repaymentTotals(
    monthTransactions.filter((transaction) => isThisMonth(transaction)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Loans</h1>
          <p className="text-muted-foreground mt-1">Track loan balances and repayment schedules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/debt-check">
              <ShieldCheck className="w-4 h-4" /> Debt check
            </Link>
          </Button>
          <Button onClick={() => { setEditingLoan(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Loan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="mt-1 text-right font-heading text-xl font-bold tabular-nums text-money-out">KES {totalBalance.toLocaleString()}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground">Active Loans</p>
          <p className="text-xl font-heading font-bold text-foreground mt-1">{activeLoans.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground">Settled</p>
          <p className="text-xl font-heading font-bold text-foreground mt-1">{paidLoans.length}</p>
        </Card>
      </div>

      {upcomingRepayments.length > 0 && (
        <Card className="p-4 border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Next Repayment Due</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingRepayments.slice(0, 3).map(loan => (
              <div key={loan.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                <span className="text-sm font-medium text-foreground">{loan.lender}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date((loan.next_payment_date || '').slice(0, 10)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </span>
                {(loan.installment_amount || (loan.frequency === 'one_time' ? loan.balance : 0)) > 0 && (
                  <span className="text-sm font-medium tabular-nums text-money-out">
                    KES {(loan.installment_amount || loan.balance).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loans.length === 0 ? (
        <Card className="p-12 border-border text-center">
          <HandCoins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No loans yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add a loan to track balances and repayments.</p>
          <Button onClick={() => { setEditingLoan(null); setShowForm(true); }} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Add Your First Loan
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeLoans.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Active</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLoans.map(loan => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onRepay={setRepayLoan}
                  />
                ))}
              </div>
            </div>
          )}
          {paidLoans.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Settled</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paidLoans.map(loan => (
                  <LoanCard key={loan.id} loan={loan} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <RepaidFootnote principal={principalRepaid} interest={interestPaid} />

      <LoanForm open={showForm} onClose={() => { setShowForm(false); setEditingLoan(null); }} onSubmit={handleSubmit} editingLoan={editingLoan} />
      <RepayForm
        open={!!repayLoan}
        loan={repayLoan}
        submitting={repayMutation.isPending}
        onClose={() => setRepayLoan(null)}
        onSubmit={(values) => repayMutation.mutate({ loan: repayLoan, ...values })}
      />
    </div>
  );
}