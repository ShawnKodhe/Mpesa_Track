import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Shield, Sparkles } from 'lucide-react';
import BudgetCard from '@/components/budget/BudgetCard';
import BudgetForm from '@/components/budget/BudgetForm';
import BudgetAlerts from '@/components/budget/BudgetAlerts';
import PausedLadderLines from '@/components/budget/PausedLadderLines';
import CeilingBreakdown from '@/components/budget/CeilingBreakdown';
import { getSpentForBudget, getMovedForBudget, getBudgetAlerts } from '@/lib/budgetUtils';
import { computeCeiling } from '@/lib/budgetCeiling';
import { summarizeMonth } from '@/lib/moneyFlows';
import MonthFigures from '@/components/summary/MonthFigures';

export default function Budget() {
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.email],
    queryFn: () => api.entities.Budget.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => api.entities.Transaction.filter({ created_by: user.email }, '-transaction_date', 500),
    enabled: !!user,
  });

  const { data: rungs = [] } = useQuery({
    queryKey: ['ladder-rungs', user?.email],
    queryFn: () => api.entities.LadderRung.filter({ created_by: user.email }, 'order', 100),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Budget.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  // Any change to a Budget or a rung re-derives the ceiling, which is recomputed
  // from these records on every render and never stored anywhere.
  useEffect(() => {
    const unsubscribeBudgets = api.entities.Budget.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    });
    const unsubscribeRungs = api.entities.LadderRung.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['ladder-rungs'] });
    });
    return () => {
      unsubscribeBudgets();
      unsubscribeRungs();
    };
  }, [queryClient]);

  const alerts = getBudgetAlerts(budgets, transactions);
  const ceiling = computeCeiling(budgets, rungs);
  const summary = summarizeMonth({ transactions, budgets, rungs });
  const necessities = budgets.filter(b => b.is_necessity);
  const wants = budgets.filter(b => !b.is_necessity);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Budget Planner</h1>
          <p className="text-muted-foreground mt-1">Plan how to use your money wisely</p>
        </div>
        <Button onClick={() => { setEditingBudget(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Budget
        </Button>
      </div>

      {alerts.length > 0 && <BudgetAlerts alerts={alerts} />}

      <MonthFigures
        allocated={summary.allocated}
        spent={summary.spent}
        moved={summary.moved}
        movedLines={summary.movedLines}
        cashLeft={summary.cashLeft}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-border bg-secondary/30">
          <p className="text-sm text-muted-foreground">Outside the ceiling</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1 tabular-nums">KES {ceiling.outsideTotal.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            One-off or debt lines running this month, not folded in
          </p>
        </Card>
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm text-primary font-medium">Necessities</p>
          </div>
          <p className="text-2xl font-heading font-bold text-foreground tabular-nums">KES {ceiling.necessitiesTotal.toLocaleString()}</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">Wants</p>
          </div>
          <p className="text-2xl font-heading font-bold text-foreground tabular-nums">KES {ceiling.wantsTotal.toLocaleString()}</p>
        </Card>
      </div>

      <CeilingBreakdown items={ceiling.counted} total={ceiling.total} />
      <PausedLadderLines items={ceiling.notCounted} />

      {/* Necessities section */}
      {necessities.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" /> Necessities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {necessities.map(b => (
              <BudgetCard key={b.id} budget={b} spent={getSpentForBudget(b, transactions)} moved={getMovedForBudget(b, transactions)} onDelete={(id) => deleteMutation.mutate(id)} onEdit={(budget) => { setEditingBudget(budget); setShowForm(true); }} onToggle={(budget) => updateMutation.mutate({ id: budget.id, data: { active: budget.active === false } })} />
            ))}
          </div>
        </div>
      )}

      {/* Wants section */}
      {wants.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-muted-foreground" /> Wants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wants.map(b => (
              <BudgetCard key={b.id} budget={b} spent={getSpentForBudget(b, transactions)} moved={getMovedForBudget(b, transactions)} onDelete={(id) => deleteMutation.mutate(id)} onEdit={(budget) => { setEditingBudget(budget); setShowForm(true); }} onToggle={(budget) => updateMutation.mutate({ id: budget.id, data: { active: budget.active === false } })} />
            ))}
          </div>
        </div>
      )}

      {budgets.length === 0 && (
        <div className="text-center py-16">
          <PiggyBankIllustration />
          <p className="text-muted-foreground mt-4">No budgets yet. Start planning your spending!</p>
          <Button className="mt-4" onClick={() => { setEditingBudget(null); setShowForm(true); }}>Create your first budget</Button>
        </div>
      )}

      <BudgetForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingBudget(null); }}
        onSubmit={(data) => editingBudget
          ? updateMutation.mutate({ id: editingBudget.id, data })
          : createMutation.mutate(data)}
        existingCategories={budgets.map(b => b.category)}
        editingBudget={editingBudget}
      />
    </div>
  );
}

function PiggyBankIllustration() {
  return (
    <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
      <span className="text-4xl">🐷</span>
    </div>
  );
}