import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { isConsumption } from '@/lib/transfers';
import {
  addDaysKey, addMonthsKey, formatLedgerDayShort, ledgerDateKey, ledgerTodayKey,
  startOfMonthKey, startOfWeekKey,
} from '@/lib/ledgerDates';

const WEEKS_SHOWN = 6;

export default function SpendingTrends({ transactions }) {
  const today = ledgerTodayKey();
  const thisWeekStart = startOfWeekKey(today);

  // Every total is bucketed by the Nairobi calendar date of the transaction.
  const spendingByDay = {};
  transactions.filter(isConsumption).forEach((t) => {
    const key = ledgerDateKey(t.transaction_date);
    if (!key) return;
    spendingByDay[key] = (spendingByDay[key] || 0) + (t.amount || 0);
  });

  // Sums a half-open Nairobi key window [start, end).
  const sumBetween = (start, end) => Object.entries(spendingByDay)
    .filter(([key]) => key >= start && key < end)
    .reduce((total, [, amount]) => total + amount, 0);

  // Build last 6 weeks of data
  const weeks = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const start = addDaysKey(thisWeekStart, -i * 7);
    weeks.push({
      label: i === 0 ? 'This Week' : formatLedgerDayShort(start),
      spent: sumBetween(start, addDaysKey(start, 7)),
      isCurrent: i === 0,
    });
  }

  const thisWeek = weeks[weeks.length - 1]?.spent || 0;
  const lastWeek = weeks[weeks.length - 2]?.spent || 0;
  const weekChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  const isUp = weekChange > 0;

  // Month comparison, on the Nairobi calendar
  const monthStart = startOfMonthKey(today);
  const lastMonthStart = addMonthsKey(monthStart, -1);

  const thisMonthSpent = sumBetween(monthStart, addDaysKey(today, 1));
  const lastMonthSpent = sumBetween(lastMonthStart, monthStart);

  const monthChange = lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;
  const monthIsUp = monthChange > 0;

  const dailyAvg = weeks[weeks.length - 1]
    ? Math.round(weeks[weeks.length - 1].spent / 7)
    : 0;

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Spending Trends</h3>
          <p className="text-sm text-muted-foreground mt-1">Weekly spending over the last 6 weeks</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="mt-1 text-right font-heading text-lg font-bold tabular-nums text-money-out">KES {thisWeek.toLocaleString()}</p>
          {lastWeek > 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isUp ? 'text-money-out' : 'text-money-in'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(weekChange).toFixed(0)}% vs last week
            </div>
          )}
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="mt-1 text-right font-heading text-lg font-bold tabular-nums text-money-out">KES {thisMonthSpent.toLocaleString()}</p>
          {lastMonthSpent > 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${monthIsUp ? 'text-money-out' : 'text-money-in'}`}>
              {monthIsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(monthChange).toFixed(0)}% vs last month
            </div>
          )}
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Daily Avg</p>
          <p className="mt-1 text-right font-heading text-lg font-bold tabular-nums text-money-out">KES {dailyAvg.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">This week per day</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
              itemStyle={{ color: 'hsl(var(--money-out))' }}
              formatter={(value) => [`KES ${value.toLocaleString()}`, 'Spent']}
            />
            <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
              {weeks.map((entry, idx) => (
                <Cell key={idx} fill={entry.isCurrent ? 'hsl(var(--chart-spent))' : 'hsl(var(--chart-spent) / 0.4)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}