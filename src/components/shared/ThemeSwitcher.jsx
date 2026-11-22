import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, applyTheme, THEME_EVENT } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'paper', label: 'Paper', icon: Sun },
];

export default function ThemeSwitcher({ className }) {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Keep every switcher on screen in sync
  useEffect(() => {
    const onChange = (event) => setTheme(event.detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn('grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/60 p-1', className)}
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-pressed={active}
            className={cn(
              'select-none flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}