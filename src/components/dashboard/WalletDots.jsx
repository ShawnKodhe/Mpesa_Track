/**
 * The descending dot-grid accent: rows of 4 / 3 / 2 / 1 dots filling in once,
 * diagonal top-right to bottom-left, in step with the number counting up.
 */
const DOTS = [
  [86, 14, '0s'], [62, 14, '0.18s'], [38, 14, '0.36s'], [14, 14, '0.54s'],
  [86, 38, '0.18s'], [62, 38, '0.36s'], [38, 38, '0.54s'],
  [86, 62, '0.36s'], [62, 62, '0.54s'],
  [86, 86, '0.54s'],
];

export default function WalletDots({ lit = false }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="h-10 w-10 shrink-0 fill-muted-foreground sm:h-12 sm:w-12"
    >
      {DOTS.map(([cx, cy, delay]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="9"
          className={lit ? 'wallet-dot wallet-dot--lit' : 'wallet-dot'}
          style={{ '--dot-delay': delay }}
        />
      ))}
    </svg>
  );
}