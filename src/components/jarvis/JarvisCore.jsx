const ACCENT_BY_MODE = {
  user_typing: 'hsl(var(--status-buffer))',
  jarvis_typing: 'hsl(var(--primary))',
  done: 'hsl(var(--status-inflow))',
  listening: 'hsl(var(--status-debt))',
  idle: 'hsl(var(--status-invest))',
};

export default function JarvisCore({ mode = 'idle', size = 56, className = '' }) {
  const accent = ACCENT_BY_MODE[mode] || ACCENT_BY_MODE.idle;
  const active = mode === 'jarvis_typing' || mode === 'listening';
  const stateClass = mode === 'jarvis_typing'
    ? 'jarvis-core--fast'
    : mode === 'user_typing'
      ? 'jarvis-core--beat'
      : mode === 'done'
        ? 'jarvis-core--settled'
        : '';

  return (
    <div
      className={`jarvis-core relative shrink-0 select-none ${stateClass} ${className}`}
      style={{ width: size, height: size, '--core-accent': accent }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
        <circle cx="60" cy="62" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <circle
          cx="60"
          cy="62"
          r="52"
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeDasharray="22 14 8 14"
          className="jarvis-core__ring origin-[60px_62px]"
        />
        {/* Crooked zombie-bot antenna + live spark */}
        <path d="M64 26 L70 11 L80 14" fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="82" cy="14" r={active ? 4.2 : 3} fill={accent} className="jarvis-core__spark" />
        {/* Side neck bolts */}
        <rect x="16" y="56" width="8" height="12" rx="2.5" fill="hsl(var(--secondary))" stroke={accent} strokeWidth="1.6" />
        <rect x="96" y="56" width="8" height="12" rx="2.5" fill="hsl(var(--secondary))" stroke={accent} strokeWidth="1.6" />
        {/* Armored undead automaton head */}
        <rect x="24" y="26" width="72" height="70" rx="16" fill="hsl(var(--card))" stroke={accent} strokeWidth="2.2" />
        {/* Cranial fracture stitches */}
        <path d="M33 36 L51 42 M38 33 L35 41 M45 36 L42 44" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" />
        {/* Dark recessed visor */}
        <rect x="31" y="46" width="58" height="25" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.4" />
        {/* Left live scanner optic + Right zombie X optic */}
        <circle cx="46" cy="58.5" r="6.8" fill="none" stroke={accent} strokeWidth="2.4" />
        <circle cx="46" cy="58.5" r="2.6" fill={accent} className="jarvis-core__spark" />
        <path d="M68 53 L79 64 M79 53 L68 64" stroke={accent} strokeWidth="2.8" strokeLinecap="round" className="jarvis-core__glitch" />
        {/* Stitched vocoder jaw grille */}
        <rect x="37" y="77" width="46" height="11" rx="4" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.3" />
        {[44, 52, 60, 68, 76].map((x, idx) => (
          <line
            key={x}
            x1={x}
            y1="79.5"
            x2={x}
            y2="85.5"
            stroke={accent}
            strokeWidth="2.4"
            strokeLinecap="round"
            className={active ? 'jarvis-core__bar' : ''}
            style={{ animationDelay: `${idx * 0.09}s` }}
          />
        ))}
      </svg>
    </div>
  );
}