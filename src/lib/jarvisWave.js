const W = 320;
const MID = 22;
const STEPS = 80;

export const WAVE_META = {
  user_typing: {
    label: 'Cardiac sync · You are typing',
    stroke: 'hsl(var(--status-buffer))',
    echo: 'hsl(var(--status-buffer) / 0.25)',
    dotClass: 'bg-buffer',
  },
  jarvis_typing: {
    label: 'Neural burst · Jarvis is typing',
    stroke: 'hsl(var(--primary))',
    echo: 'hsl(var(--status-invest) / 0.42)',
    dotClass: 'bg-primary',
  },
  done: {
    label: 'Afterglow · Reply complete',
    stroke: 'hsl(var(--status-inflow))',
    echo: 'hsl(var(--status-inflow) / 0.3)',
    dotClass: 'bg-inflow',
  },
  listening: {
    label: 'Voice link · Listening',
    stroke: 'hsl(var(--status-debt))',
    echo: 'hsl(var(--status-debt) / 0.3)',
    dotClass: 'bg-debt',
  },
  idle: {
    label: 'Dormant pulse · Ready',
    stroke: 'hsl(var(--muted-foreground) / 0.65)',
    echo: 'transparent',
    dotClass: 'bg-muted-foreground',
  },
};

const gauss = (u, c, w) => Math.exp(-(((u - c) / w) ** 2));

const ecgComplex = (u) => (
  -3.2 * gauss(u, 0.18, 0.035)
  + 4.2 * gauss(u, 0.275, 0.013)
  - 16.5 * gauss(u, 0.315, 0.016)
  + 10.8 * gauss(u, 0.355, 0.018)
  - 5.0 * gauss(u, 0.49, 0.045)
);

export function sampleWave(mode, phase, boost = 0) {
  let main = '';
  let echo = '';
  let headY = MID;

  for (let i = 0; i <= STEPS; i += 1) {
    const nx = i / STEPS;
    const x = nx * W;
    const taper = Math.sin(nx * Math.PI);
    let dy = 0;
    let ey = 0;

    if (mode === 'user_typing') {
      const u = ((nx * 2.1 - phase * 0.55) % 1 + 1) % 1;
      dy = ecgComplex(u) * (0.88 + boost * 0.32) * (0.35 + 0.65 * taper);
      ey = dy * 0.35;
    } else if (mode === 'jarvis_typing') {
      const env = (0.4 + 0.6 * Math.abs(Math.sin(nx * Math.PI * 3 + phase * 1.9))) * taper;
      dy = (Math.sin(nx * 48 - phase * 10.5) * 11.5 + Math.cos(nx * 31 + phase * 7) * 4.5) * env;
      ey = -Math.sin(nx * 40 + phase * 8.2) * 8.5 * env;
    } else if (mode === 'done') {
      dy = (Math.sin(nx * Math.PI * 6) * Math.cos(phase * 2.6) * 7.8 + Math.sin(nx * Math.PI * 3 - phase * 1.6) * 3.4) * taper;
      ey = -Math.sin(nx * Math.PI * 6) * Math.cos(phase * 2.6) * 4.4 * taper;
    } else if (mode === 'listening') {
      dy = (Math.sin(nx * 24 - phase * 5.8) * 9.5 + Math.sin(nx * 13 + phase * 3.6) * 4.5) * taper;
      ey = -dy * 0.45;
    } else {
      const u = ((nx - phase * 0.22) % 1 + 1) % 1;
      dy = (-5.5 * gauss(u, 0.5, 0.022) + 2.8 * gauss(u, 0.53, 0.018)) * taper;
    }

    const cmd = i === 0 ? 'M' : 'L';
    const y = (MID + dy).toFixed(2);
    main += `${cmd}${x.toFixed(1)},${y} `;
    echo += `${cmd}${x.toFixed(1)},${(MID + ey).toFixed(2)} `;
    if (i === STEPS - 6) headY = MID + dy;
  }

  return { main, echo, headX: ((STEPS - 6) / STEPS) * W, headY };
}