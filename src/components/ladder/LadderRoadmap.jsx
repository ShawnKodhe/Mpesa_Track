import { TYPE_META } from '@/lib/ladderData';
import { fmtShort } from '@/lib/ladder';
import { startMonthYear } from '@/lib/rungDates';

export default function LadderRoadmap({ rungs }) {
  const ordered = [...rungs].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
      <div className="relative min-w-[700px] pt-1 pb-2">
        <div className="absolute left-3 right-3 top-[32px] h-[2px] bg-border" />
        <div className="flex items-start gap-3">
          {ordered.map((rung) => {
            const meta = TYPE_META[rung.type] || TYPE_META.buffer;
            const label = startMonthYear(rung, rungs);
            return (
              <div key={rung.id} className="flex flex-col items-center w-[62px] shrink-0">
                <span className="text-xs font-semibold text-foreground text-center leading-tight">{label || '—'}</span>
                <span className={`mt-1.5 w-3.5 h-3.5 rounded-full ${meta.dot} ring-4 ring-background z-10`} />
                <span className="mt-2 text-xs text-center leading-tight text-muted-foreground line-clamp-2">
                  {rung.name}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{fmtShort(rung.target_amount)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}