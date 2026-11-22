import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSpentForBudget, CATEGORY_LABELS } from '@/lib/budgetUtils';
import { consumptionOf, isConsumption } from '@/lib/transfers';
import SpendingPeriods from '@/components/analytics/SpendingPeriods';
import ReceivedPeriods from '@/components/analytics/ReceivedPeriods';
import { formatLedgerMonth, ledgerDateKey, ledgerMonthKeys } from '@/lib/ledgerDates';

const COLORS = [
  'hsl(var(--cat-1))', 'hsl(var(--cat-2))', 'hsl(var(--cat-3))',
  'hsl(var(--cat-4))', 'hsl(var(--cat-5))', 'hsl(var(--cat-6))',
  'hsl(var(--cat-7))', 'hsl(var(--cat-8))', 'hsl(var(--cat-9))',
  'hsl(var(--cat-10))', 'hsl(var(--cat-11))', 'hsl(var(--cat-12))', 'hsl(var(--cat-13))',
];

export default function Analytics() {
  const { user } = useAuth();

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

  const spending = consumptionOf(transactions);
  const income = transactions.filter(t => ['received', 'deposit'].includes(t.type));

  // Category spending data
  const categoryTotals = {};
  spending.forEach(t => {
    const cat = t.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([cat, amount], i) => ({
      name: CATEGORY_LABELS[cat] || cat,
      amount,
      fill: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly comparison, bucketed by the Nairobi calendar month of each record
  const monthlyData = ledgerMonthKeys(6).map((monthKey) => {
    const inMonth = transactions.filter(t => ledgerDateKey(t.transaction_date).slice(0, 7) === monthKey.slice(0, 7));
    const monthSpent = inMonth.filter(isConsumption).reduce((s, t) => s + (t.amount || 0), 0);
    const monthIncome = inMonth.filter(t => ['received', 'deposit'].includes(t.type)).reduce((s, t) => s + (t.amount || 0), 0);
    return { month: formatLedgerMonth(monthKey), spent: monthSpent, received: monthIncome };
  });

  // Budget vs actual (period-aware)
  const budgetComparison = budgets.filter(b => b.active !== false).map(b => {
    const spent = getSpentForBudget(b, transactions);
    return {
      name: CATEGORY_LABELS[b.category] || b.category,
      budgeted: b.amount,
      spent,
      isOver: spent > b.amount,
      is_necessity: b.is_necessity,
    };
  });

  const totalSpent = spending.reduce((s, t) => s + (t.amount || 0), 0);
  const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome * 100).toFixed(1) : 0;

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into your spending habits</p>
      </div>

      {/* Key insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-money-out" />
              <p className="text-sm text-muted-foreground">Total Spending</p>
            </div>
            <p className="text-right font-heading text-2xl font-bold tabular-nums text-money-out">KES {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {spending.length} transactions</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-money-in" />
              <p className="text-sm text-muted-foreground">Total Income</p>
            </div>
            <p className="text-right font-heading text-2xl font-bold tabular-nums text-money-in">KES {totalIncome.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {income.length} transactions</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className={`p-5 ${parseFloat(savingsRate) >= 20 ? 'border-inflow/30 bg-inflow/5' : 'border-debt/30 bg-debt/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              {parseFloat(savingsRate) >= 20 ? <CheckCircle2 className="w-4 h-4 text-inflow" /> : <AlertTriangle className="w-4 h-4 text-debt" />}
              <p className="text-sm text-muted-foreground">Savings Rate</p>
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{savingsRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {parseFloat(savingsRate) >= 20 ? 'Great job saving!' : 'Aim for 20% or more'}
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Spending by Period */}
      <SpendingPeriods transactions={transactions} now={now} />

      {/* Received by Period, same selector and boundaries as spending */}
      <ReceivedPeriods transactions={transactions} now={now} />

      {/* Monthly overview */}
      <Card className="p-6 border-border">
        <h3 className="font-heading font-semibold text-foreground mb-1">Monthly Overview</h3>
        <p className="text-sm text-muted-foreground mb-6">Last 6 months income vs spending</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value) => [`KES ${value.toLocaleString()}`, '']}
              />
              <Bar dataKey="received" fill="hsl(var(--status-inflow))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spent" fill="hsl(var(--chart-spent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <Card className="p-6 border-border">
          <h3 className="font-heading font-semibold text-foreground mb-1">Spending by Category</h3>
          <p className="text-sm text-muted-foreground mb-6">Where your money goes</p>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.map((item) => {
                const maxAmount = categoryData[0]?.amount || 1;
                const widthPercent = (item.amount / maxAmount) * 100;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-medium tabular-nums text-money-out">KES {item.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: item.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
          )}
        </Card>

        {/* Budget vs actual */}
        <Card className="p-6 border-border">
          <h3 className="font-heading font-semibold text-foreground mb-1">Budget vs Actual</h3>
          <p className="text-sm text-muted-foreground mb-6">How you're tracking against budgets</p>
          {budgetComparison.length > 0 ? (
            <div className="space-y-4">
              {budgetComparison.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground flex items-center gap-1">
                      {item.name}
                      {item.isOver && <AlertTriangle className="w-3 h-3 text-money-out" />}
                    </span>
                    <span className={`font-medium tabular-nums ${item.isOver ? 'text-money-out' : 'text-inflow'}`}>
                      KES {item.spent.toLocaleString()} / {item.budgeted.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((item.spent / item.budgeted) * 100, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${item.isOver ? 'bg-money-out' : 'bg-inflow'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No budgets set yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}