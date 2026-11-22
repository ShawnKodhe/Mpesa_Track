import { useState } from 'react';
import { motion } from 'framer-motion';
import { isConsumption, isTransfer, sumAmount } from '@/lib/transfers';
import {
  describeLedgerRange,
  describeLedgerRangeShort,
  entriesInRange,
} from '@/lib/ledgerDates';
import { periodTotals } from '@/lib/periods';

/**
 * Spending by period, summed on the Nairobi calendar date of each transaction.
 * Every figure is recomputed from the records on render, never stored.
 */
export default function SpendingPeriods({ transactions = [], now = new Date() }) {
  const [preset, setPreset] = useState('today');

  const spending = transactions.filter(isConsumption);
  const moves = transactions.filter(isTransfer);

  const cards = periodTotals(spending, now);

  const active = cards.find((card) => card.value === preset) || cards[0];
  const movedInRange = sumAmount(entriesInRange(moves, active.range));
  const countLabel = active.count === 1 ? '1 transaction' : `${active.count} transactions`;

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Spending by Period</h2>
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
                <p className="text-right font-heading text-xl font-bold tabular-nums text-money-out">KES {card.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{describeLedgerRangeShort(card.range)}</p>
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" data-period-range>
        {describeLedgerRange(active.range)} · {countLabel}
        {movedInRange > 0 && (
          <span className="text-money-moved">
            {' '}· KES {movedInRange.toLocaleString()} moved to savings, not spending
          </span>
        )}
      </p>
    </div>
  );
}