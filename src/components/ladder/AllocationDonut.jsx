import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TYPE_META } from '@/lib/ladderData';
import { fmtKES } from '@/lib/ladder';
import { isBufferRung } from '@/lib/ladderBuffer';

const TYPE_FILL = {
  buffer: 'hsl(var(--status-buffer))',
  debt: 'hsl(var(--status-debt))',
  investment: 'hsl(var(--status-invest))',
};

export default function AllocationDonut({ rungs }) {
  const open = rungs.filter((r) => r.status !== 'complete' && (r.monthly_contribution || 0) > 0);
  const totals = { buffer: 0, debt: 0, investment: 0 };
  open.forEach((rung) => {
    const key = totals[rung.type] !== undefined ? rung.type : 'buffer';
    const monthly = rung.monthly_contribution || 0;
    // The five buffer checkpoints are one pot with one monthly plan, so the
    // buffer side is counted once rather than five times over.
    if (isBufferRung(rung)) totals.buffer = Math.max(totals.buffer, monthly);
    else totals[key] += monthly;
  });

  const data = Object.keys(totals)
    .filter((key) => totals[key] > 0)
    .map((key) => ({ key, label: TYPE_META[key].label, value: totals[key], fill: TYPE_FILL[key] }));

  const monthlyTotal = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing allocated yet.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative w-[120px] h-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmtKES(value)}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-heading font-bold text-foreground">{monthlyTotal / 1000}k</span>
              <span className="text-xs text-muted-foreground">per month</span>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs min-w-0">
            {data.map((entry) => (
              <li key={entry.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                <span className="text-muted-foreground truncate">{entry.label}</span>
                <span className="ml-auto font-semibold text-foreground">{fmtKES(entry.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}