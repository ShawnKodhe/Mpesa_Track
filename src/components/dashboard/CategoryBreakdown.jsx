import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { isConsumption } from '@/lib/transfers';

const CATEGORY_COLORS = {
  food: 'hsl(var(--cat-8))',
  transport: 'hsl(var(--cat-6))',
  utilities: 'hsl(var(--cat-7))',
  rent: 'hsl(var(--cat-9))',
  entertainment: 'hsl(var(--cat-3))',
  health: 'hsl(var(--cat-4))',
  education: 'hsl(var(--cat-1))',
  savings: 'hsl(var(--cat-10))',
  airtime: 'hsl(var(--cat-5))',
  shopping: 'hsl(var(--cat-14))',
  family: 'hsl(var(--cat-12))',
  business: 'hsl(var(--cat-11))',
  other: 'hsl(var(--cat-13))',
};

const CATEGORY_LABELS = {
  food: 'Food & Groceries',
  transport: 'Transport',
  utilities: 'Utilities',
  rent: 'Rent',
  entertainment: 'Entertainment',
  health: 'Health',
  education: 'Education',
  savings: 'Savings',
  airtime: 'Airtime',
  shopping: 'Shopping',
  family: 'Family',
  business: 'Business',
  other: 'Other',
};

export default function CategoryBreakdown({ transactions }) {
  const spending = transactions.filter(isConsumption);
  const categoryTotals = {};
  spending.forEach(t => {
    const cat = t.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
  });

  const data = Object.entries(categoryTotals)
    .map(([category, amount]) => {
      const key = (category || 'other').toLowerCase().trim();
      return {
        name: CATEGORY_LABELS[key] || category,
        value: amount,
        color: CATEGORY_COLORS[key] || CATEGORY_COLORS.other,
      };
    })
    .sort((a, b) => b.value - a.value);

  const totalSpent = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-6 border-border">
      <h3 className="font-heading font-semibold text-foreground mb-1">Spending by Category</h3>
      <p className="text-sm text-muted-foreground mb-6">Where your money goes</p>

      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No spending data yet</p>
      ) : (
        <div className="flex flex-col items-center">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`KES ${value.toLocaleString()}`, '']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--money-out))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full mt-4 space-y-2">
            {data.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium tabular-nums text-money-out">KES {item.value.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}