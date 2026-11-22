import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import WalletCard from '@/components/dashboard/WalletCard';
import WalletBreakdown from '@/components/dashboard/WalletBreakdown';
import ReceivedCard from '@/components/dashboard/ReceivedCard';
import ReconcileSheet from '@/components/dashboard/ReconcileSheet';
import SummaryBar from '@/components/dashboard/SummaryBar';
import SpendingChart from '@/components/dashboard/SpendingChart';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SpendingTrends from '@/components/dashboard/SpendingTrends';
import { useAuth } from '@/lib/AuthContext';
import { summarizeMonth } from '@/lib/moneyFlows';
import { computeWallet } from '@/lib/wallet';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const refreshing = usePullToRefresh(() => queryClient.invalidateQueries());
  const { user } = useAuth();
  const [showWallet, setShowWallet] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => api.entities.Transaction.filter({ created_by: user.email }, '-transaction_date', 500),
    enabled: !!user,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.email],
    queryFn: () => api.entities.Budget.filter({ created_by: user.email }),
    enabled: !!user,
  });

  // Realtime subscription: invalidate queries when transactions change from anywhere
  useEffect(() => {
    if (!user) return;
    const unsubscribe = api.entities.Transaction.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    });
    return unsubscribe;
  }, [user, queryClient]);

  const { data: rungs = [] } = useQuery({
    queryKey: ['ladder-rungs', user?.email],
    queryFn: () => api.entities.LadderRung.filter({ created_by: user.email }, 'order', 100),
    enabled: !!user,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans', user?.email],
    queryFn: () => api.entities.Loan.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: debtsOwed = [] } = useQuery({
    queryKey: ['debts-owed', user?.email],
    queryFn: () => api.entities.DebtOwed.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['wallet-snapshots', user?.email],
    queryFn: () => api.entities.WalletSnapshot.filter({ created_by: user.email }, '-snapshot_date', 50),
    enabled: !!user,
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['reconciliations', user?.email],
    queryFn: () => api.entities.Reconciliation.filter({ created_by: user.email }, '-recon_date', 3),
    enabled: !!user,
  });

  const summary = summarizeMonth({ transactions, budgets, rungs });
  const wallet = computeWallet({ transactions, loans, debts: debtsOwed, snapshots });

  return (
    <div className="space-y-6">
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your M-Pesa financial overview</p>
      </div>

      <WalletCard
        wallet={wallet}
        reconciliations={reconciliations}
        onOpen={() => setShowWallet(true)}
        onReconcile={() => setShowReconcile(true)}
      />
      <WalletBreakdown open={showWallet} onOpenChange={setShowWallet} wallet={wallet} />
      <ReconcileSheet open={showReconcile} onOpenChange={setShowReconcile} wallet={wallet} />

      <ReceivedCard transactions={transactions} />

      <SummaryBar summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpendingChart transactions={transactions} />
        </div>
        <CategoryBreakdown transactions={transactions} />
      </div>

      <SpendingTrends transactions={transactions} />

      <RecentTransactions transactions={transactions} />
    </div>
  );
}