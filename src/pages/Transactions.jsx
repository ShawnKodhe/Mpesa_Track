import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, Utensils } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionsList from '@/components/transactions/TransactionsList';
import MpesaImport from '@/components/transactions/MpesaImport';
import { isTransfer } from '@/lib/transfers';
import { ledgerDateKey, ledgerRange } from '@/lib/ledgerDates';

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [foodOnly, setFoodOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const queryClient = useQueryClient();
  const refreshing = usePullToRefresh(() => queryClient.invalidateQueries());
  const { user } = useAuth();
  const { toast } = useToast();

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

  const budgetCategories = budgets.map(b => b.category).filter(Boolean);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const created = await api.entities.Transaction.create(data);
      // A draw opens or grows a loan, a principal repayment reduces one.
      await api.functions.invoke('loanLedger', { action: 'sync_transaction', transactionId: created.id });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const check = await api.functions.invoke('loanLedger', { action: 'check_delete', transactionId: id });
      if (check.data?.blocked) return { blocked: true, reason: check.data.reason };
      await api.entities.Transaction.delete(id);
      return { blocked: false };
    },
    onSuccess: (result) => {
      if (result?.blocked) {
        toast({ title: 'This draw cannot be deleted', description: result.reason, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  const filtered = transactions.filter(t => {
    const matchSearch = !search || 
      t.recipient?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.mpesa_ref?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all'
      || (typeFilter === 'transfer'
        ? isTransfer(t)
        : t.type === typeFilter && !isTransfer(t));
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    const matchFood = !foodOnly || t.category === 'food';
    const tDate = ledgerDateKey(t.transaction_date);
    const matchDateFrom = !dateFrom || tDate >= dateFrom;
    const matchDateTo = !dateTo || tDate <= dateTo;
    return matchSearch && matchType && matchCat && matchFood && matchDateFrom && matchDateTo;
  });

  const applyDatePreset = (preset) => {
    const range = ledgerRange(preset);
    setDateFrom(range.start);
    setDateTo(range.end);
    setDatePreset(preset);
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    setDatePreset('all');
  };

  return (
    <div className="space-y-6">
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">Manage your M-Pesa transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => { setFoodOnly(!foodOnly); setCategoryFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            foodOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          <Utensils className="w-4 h-4" />
          Food only
        </button>
        <button
          onClick={() => applyDatePreset('today')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            datePreset === 'today'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => applyDatePreset('week')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            datePreset === 'week'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => applyDatePreset('month')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            datePreset === 'month'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => applyDatePreset('last7')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            datePreset === 'last7'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => { setShowCustomDate(!showCustomDate); if (datePreset !== 'custom') clearDates(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            showCustomDate
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          Custom
        </button>
        {showCustomDate && (
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); }} className="w-full sm:w-36" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); }} className="w-full sm:w-36" />
          </div>
        )}
        {(dateFrom || dateTo) && (
          <button
            onClick={clearDates}
            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            Clear dates
          </button>
        )}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="airtime">Airtime</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="credit_purchase">On credit</SelectItem>
            <SelectItem value="loan">Loan draw</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Array.from(new Set([...['food','transport','utilities','rent','entertainment','health','education','reserves','airtime','shopping','family','business','other'], ...budgetCategories])).map(c => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TransactionsList transactions={filtered} onDelete={(id) => deleteMutation.mutate(id)} />
      <TransactionForm open={showForm} onClose={() => setShowForm(false)} onSubmit={(data) => createMutation.mutate(data)} budgetCategories={budgetCategories} />
      <MpesaImport open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}