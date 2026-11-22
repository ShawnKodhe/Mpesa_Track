export default function JarvisDots({ label = 'Jarvis is thinking' }) {
  return (
    <span className="flex items-center gap-1 py-1" aria-label={label}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="jarvis-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: `${index * 0.16}s` }}
        />
      ))}
    </span>
  );
}