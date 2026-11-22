import { useState } from 'react';
import { Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LIQUIDITY_META, liquidityOf } from '@/lib/liquidity';

export default function LiquidityBadge({ value, rung, className = '' }) {
  const meta = LIQUIDITY_META[value || liquidityOf(rung)] || LIQUIDITY_META.liquid;
  const [open, setOpen] = useState(false);

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 ${meta.pill}`}
      >
        {meta.label}
      </span>
      <button
        type="button"
        aria-label={`What ${meta.label.toLowerCase()} means`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 ${meta.pill}`}
              >
                {meta.label}
              </span>
              What {meta.label.toLowerCase()} means
            </SheetTitle>
            <SheetDescription className="text-sm leading-6">
              {meta.definition}
            </SheetDescription>
          </SheetHeader>
          <div className="pb-6" />
        </SheetContent>
      </Sheet>
    </span>
  );
}