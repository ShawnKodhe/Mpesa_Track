import JarvisCore from './JarvisCore';
import JarvisHeartbeat from './JarvisHeartbeat';

export default function JarvisHeaderDeck({
  compact,
  mode,
  status,
  pulseTick,
  invitation,
}) {
  if (!compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-2 text-center">
        <JarvisCore mode={mode} size={124} />
        <div className="space-y-1">
          <h1 className="font-heading text-lg font-bold text-foreground">Jarvis</h1>
          <p className="max-w-[18rem] text-sm text-muted-foreground">{invitation}</p>
        </div>
        <div className="w-full max-w-sm">
          <JarvisHeartbeat mode={mode} pulseTick={pulseTick} />
        </div>
      </div>
    );
  }

  return (
    <header className="glass-bar mb-2.5 shrink-0 rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <JarvisCore mode={mode} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="font-heading text-base font-bold leading-tight text-foreground">Jarvis</h1>
            <span className="truncate text-[11px] text-muted-foreground">{status}</span>
          </div>
          <JarvisHeartbeat mode={mode} pulseTick={pulseTick} className="mt-1.5" />
        </div>
      </div>
    </header>
  );
}