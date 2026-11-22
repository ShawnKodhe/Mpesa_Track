import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, HandCoins, AlertCircle } from 'lucide-react';
import DebtOwedCard from '@/components/debts/DebtOwedCard';
import DebtOwedForm from '@/components/debts/DebtOwedForm';
import { ledgerTodayKey } from '@/lib/ledgerDates';

export default function DebtsOwed() {
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts-owed', user?.email],
    queryFn: () => api.entities.DebtOwed.filter({ created_by: user.email }, '-due_date', 500),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.DebtOwed.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts-owed'] });
      setShowForm(false);
      setEditingDebt(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.DebtOwed.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts-owed'] });
      setShowForm(false);
      setEditingDebt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.DebtOwed.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts-owed'] }),
  });

  const handleEdit = (debt) => {
    setEditingDebt(debt);
    setShowForm(true);
  };

  const handleSubmit = (data) => {
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const outstanding = debts.filter(d => d.status === 'outstanding');
  const settled = debts.filter(d => d.status === 'settled');
  const totalOutstanding = outstanding.reduce((s, d) => s + (d.balance || 0), 0);

  const today = ledgerTodayKey();
  const overdueDebts = outstanding
    .filter(d => d.due_date && d.due_date.slice(0, 10) < today)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Debts Owed to Me</h1>
          <p className="text-muted-foreground mt-1">Track money people owe you and collect on time</p>
        </div>
        <Button onClick={() => { setEditingDebt(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Debt
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="mt-1 text-right font-heading text-xl font-bold tabular-nums text-money-in">KES {totalOutstanding.toLocaleString()}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-heading font-bold text-foreground mt-1">{outstanding.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground">Settled</p>
          <p className="text-xl font-heading font-bold text-foreground mt-1">{settled.length}</p>
        </Card>
      </div>

      {overdueDebts.length > 0 && (
        <Card className="p-4 border-border bg-destructive/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Overdue</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueDebts.slice(0, 3).map(debt => (
              <div key={debt.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                <span className="text-sm font-medium text-foreground">{debt.debtor}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date((debt.due_date || '').slice(0, 10)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-sm font-medium tabular-nums text-money-in">KES {(debt.balance || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : debts.length === 0 ? (
        <Card className="p-12 border-border text-center">
          <HandCoins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No debts tracked yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add a debt someone owes you to start tracking.</p>
          <Button onClick={() => { setEditingDebt(null); setShowForm(true); }} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Add Your First Debt
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {outstanding.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Outstanding</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outstanding.map(debt => (
                  <DebtOwedCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
          {settled.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Settled</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settled.map(debt => (
                  <DebtOwedCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DebtOwedForm open={showForm} onClose={() => { setShowForm(false); setEditingDebt(null); }} onSubmit={handleSubmit} editingDebt={editingDebt} />
    </div>
  );
}