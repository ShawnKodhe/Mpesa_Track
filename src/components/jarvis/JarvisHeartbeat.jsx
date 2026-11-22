import { useEffect, useRef } from 'react';
import { WAVE_META, sampleWave } from '@/lib/jarvisWave';

export default function JarvisHeartbeat({ mode = 'idle', pulseTick = 0, className = '' }) {
  const mainRef = useRef(null);
  const echoRef = useRef(null);
  const dotRef = useRef(null);
  const boostRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (pulseTick > 0) boostRef.current = 1;
  }, [pulseTick]);

  useEffect(() => {
    const paint = (phase) => {
      const { main, echo, headX, headY } = sampleWave(modeRef.current, phase, boostRef.current);
      mainRef.current?.setAttribute('d', main);
      echoRef.current?.setAttribute('d', echo);
      dotRef.current?.setAttribute('cx', headX.toFixed(1));
      dotRef.current?.setAttribute('cy', headY.toFixed(2));
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      paint(0.4);
      return undefined;
    }

    let rafId;
    const start = performance.now();
    const loop = (now) => {
      boostRef.current *= 0.9;
      paint((now - start) / 1000);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [mode]);

  const meta = WAVE_META[mode] || WAVE_META.idle;

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass} ${mode !== 'idle' ? 'animate-pulse' : ''}`} />
          {meta.label}
        </span>
      </div>
      <div className="relative h-9 w-full overflow-hidden rounded-lg border border-border/70 bg-background/60 px-1">
        <svg viewBox="0 0 320 44" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <line x1="0" y1="22" x2="320" y2="22" stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth="1" />
          <path ref={echoRef} fill="none" stroke={meta.echo} strokeWidth="1.5" strokeLinecap="round" />
          <path ref={mainRef} fill="none" stroke={meta.stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle ref={dotRef} r="2.6" fill={meta.stroke} />
        </svg>
      </div>
    </div>
  );
}