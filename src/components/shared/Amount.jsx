import { MONEY_TONE, signOf } from '@/lib/moneyTone';

/**
 * A single money figure: right-aligned, tabular, coloured by direction.
 * direction: 'in' | 'out' | 'moved' | 'neutral'
 */
export default function Amount({ value = 0, direction = 'neutral', signed = false, label, className = '' }) {
  const tone = MONEY_TONE[direction] || MONEY_TONE.neutral;
  const sign = signed ? signOf(direction) : '';
  return (
    <span className={`inline-flex flex-col items-end text-right leading-tight ${className}`}>
      <span className={`font-semibold tabular-nums ${tone}`}>
        {sign}KES {Math.abs(value || 0).toLocaleString()}
      </span>
      {label && <span className={`text-[10px] font-medium ${tone} opacity-90`}>{label}</span>}
    </span>
  );
}