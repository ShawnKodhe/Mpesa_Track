import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { isConsumption, isIncome } from '@/lib/transfers';
import { addDaysKey, formatLedgerDayShort, ledgerDateKey, ledgerTodayKey } from '@/lib/ledgerDates';

export default function SpendingChart({ transactions }) {
  const todayKey = ledgerTodayKey();
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const dayKey = addDaysKey(todayKey, -i);
    const dayTransactions = transactions.filter(t => ledgerDateKey(t.transaction_date) === dayKey);
    const spent = dayTransactions
      .filter(isConsumption)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const received = dayTransactions
      .filter(isIncome)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    last30Days.push({
      date: formatLedgerDayShort(dayKey),
      spent,
      received,
    });
  }

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Cash Flow</h3>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days overview</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-money-out" />
            <span className="text-muted-foreground">Spent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-inflow" />
            <span className="text-muted-foreground">Received</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last30Days}>
            <defs>
              <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-spent))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--chart-spent))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--status-inflow))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--status-inflow))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              formatter={(value) => [`KES ${value.toLocaleString()}`, '']}
            />
            <Area type="monotone" dataKey="spent" stroke="hsl(var(--chart-spent))" fill="url(#spentGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="received" stroke="hsl(var(--status-inflow))" fill="url(#receivedGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}