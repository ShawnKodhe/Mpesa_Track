import RungStep from './RungStep';
import { rungPct } from '@/lib/ladder';

export default function RungRail({ rungs, expandedId, onToggle, renderDetail }) {
  const total = rungs.length || 1;
  const completed = rungs.filter((r) => r.status === 'complete').length;
  const activeRung = rungs.find((r) => r.status === 'active');
  const activePct = activeRung ? rungPct(activeRung) : 0;
  const fillPct = Math.min(100, ((completed + activePct / 100) / total) * 100);

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-3 bottom-3 w-[3px] rounded-full bg-border" />
      <div
        className="rung-rail absolute left-[11px] bottom-3 w-[3px] rounded-full bg-gradient-to-t from-inflow/50 to-inflow transition-all duration-700"
        style={{ height: `${fillPct}%` }}
      />

      <div className="space-y-2.5">
        {rungs.map((rung) => (
          <div key={rung.id}>
            <RungStep
              rung={rung}
              rungs={rungs}
              expanded={expandedId === rung.id}
              onToggle={() => onToggle(rung.id)}
            />
            {expandedId === rung.id && renderDetail(rung)}
          </div>
        ))}
      </div>
    </div>
  );
}