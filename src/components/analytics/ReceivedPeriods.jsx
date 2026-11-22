import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { describeLedgerRange, describeLedgerRangeShort, entriesInRange } from '@/lib/ledgerDates';
import { periodTotals } from '@/lib/periods';
import { loanDrawsOf, receiptBuckets, receiptSummary, receiptsOf } from '@/lib/received';
import { sumAmount } from '@/lib/transfers';
import { kes } from '@/lib/wallet';

/**
 * Received by period, on the same selector and the same Nairobi boundaries as
 * Spending by period, so the two cards read as a pair. Loan draws are shown
 * below the line, never mixed into it.
 */
export default function ReceivedPeriods({ transactions = [], now = new Date() }) {
  const [preset, setPreset] = useState('today');

  const receipts = receiptsOf(transactions);
  const draws = loanDrawsOf(transactions);

  const cards = periodTotals(receipts, now);
  const active = cards.find((card) => card.value === preset) || cards[0];

  const summary = receiptSummary(active.entries);
  const buckets = receiptBuckets(active.entries, active.range);
  const drawsInRange = sumAmount(entriesInRange(draws, active.range));
  const countLabel = active.count === 1 ? '1 transaction' : `${active.count} transactions`;
  const largestLabel = summary.largest?.recipient || summary.largest?.category || '';

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Received by Period</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => {
          const isActive = card.value === active.value;
          return (
            <motion.div key={card.value} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button
                type="button"
                onClick={() => setPreset(card.value)}
                aria-pressed={isActive}
                className={`w-full rounded-xl border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  isActive
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <p className={`text-xs font-medium mb-2 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{card.label}</p>
                <p className="text-right font-heading text-xl font-bold tabular-nums text-money-in">{kes(card.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">{describeLedgerRangeShort(card.range)}</p>
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" data-period-range>
        {describeLedgerRange(active.range)} · {countLabel}
      </p>

      <Card className="mt-4 border-border p-5 sm:p-6">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, 'auto']}
                allowDecimals={false}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value) => [kes(value), 'Received']}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--money-in))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {summary.total === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Nothing received in this period, so the line sits flat at zero.</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Total received</p>
            <p className="mt-0.5 text-right font-heading text-lg font-bold tabular-nums text-money-in">{kes(summary.total)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Largest single receipt</p>
            <p className="mt-0.5 text-right font-heading text-lg font-bold tabular-nums text-foreground">
              {kes(summary.largest?.amount || 0)}
            </p>
            <p className="text-right text-[11px] text-muted-foreground">{largestLabel || 'None in this period'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Average per active day</p>
            <p className="mt-0.5 text-right font-heading text-lg font-bold tabular-nums text-foreground">{kes(summary.averagePerDay)}</p>
            <p className="text-right text-[11px] text-muted-foreground">
              {summary.activeDays === 1 ? '1 day with money in' : `${summary.activeDays} days with money in`}
            </p>
          </div>
        </div>

        {drawsInRange > 0 && (
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
            Loan draws in this period: {kes(drawsInRange)}, borrowed and not income, so kept out of the figures above.
          </p>
        )}
      </Card>
    </div>
  );
}