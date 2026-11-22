import MonthFigures from '@/components/summary/MonthFigures';

export default function SummaryBar({ summary }) {
  return (
    <section className="glass-bar rounded-2xl p-3 shadow-card sm:p-4" aria-label="Month summary">
      <MonthFigures
        allocated={summary.allocated}
        spent={summary.spent}
        moved={summary.moved}
        movedLines={summary.movedLines}
        cashLeft={summary.cashLeft}
      />
    </section>
  );
}