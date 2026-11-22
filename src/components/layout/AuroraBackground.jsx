export default function AuroraBackground() {
  return (
    <div aria-hidden="true" className="aurora-layer pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      <div className="absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full bg-buffer/20 blur-3xl motion-safe:animate-aurora-a" />
      <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-debt/15 blur-3xl motion-safe:animate-aurora-b" />
      <div className="absolute left-1/3 -top-56 h-[600px] w-[600px] rounded-full bg-invest/20 blur-3xl motion-safe:animate-aurora-c" />
    </div>
  );
}