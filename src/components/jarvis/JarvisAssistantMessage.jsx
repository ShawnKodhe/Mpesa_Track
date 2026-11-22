import { useEffect, useState } from 'react';
import JarvisActionCard from './JarvisActionCard';
import JarvisDots from './JarvisDots';
import { formatClock } from '@/lib/jarvisClock';

export default function JarvisAssistantMessage({ message, onGrow, onDone, onConfirm, onCancel }) {
  const { text, animate, actions = [], at } = message;
  const [shown, setShown] = useState(animate ? 0 : text.length);
  const [thinking, setThinking] = useState(!!animate);
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    if (!animate) {
      setShown(text.length);
      setThinking(false);
      return undefined;
    }
    setThinking(true);
    setShown(0);
    let interval;
    const start = setTimeout(() => {
      setThinking(false);
      interval = setInterval(() => {
        setShown((count) => {
          if (count >= text.length) {
            clearInterval(interval);
            return count;
          }
          return Math.min(text.length, count + 2);
        });
      }, 18);
    }, 620);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, animate]);

  useEffect(() => {
    onGrow?.();
  }, [shown, thinking, onGrow]);

  const complete = shown >= text.length;

  useEffect(() => {
    if (animate && complete && !thinking) {
      onDone?.(message.id);
    }
  }, [animate, complete, thinking, message.id, onDone]);

  return (
    <div className="jarvis-msg flex w-full flex-col items-start gap-1.5">
      <div className="glass-bar max-w-[92%] rounded-[14px] px-3.5 py-3">
        {thinking ? (
          <JarvisDots />
        ) : (
          <p
            onClick={() => setShowTime((value) => !value)}
            className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
          >
            {text.slice(0, shown)}
            {!complete && <span className="jarvis-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] bg-primary/70 align-middle" aria-hidden="true" />}
          </p>
        )}
      </div>

      {showTime && <span className="pl-1 text-[11px] text-muted-foreground">{formatClock(at)}</span>}

      {complete && actions.length > 0 && (
        <div className="mt-1 flex w-full flex-col gap-2">
          {actions.map((action) => (
            <JarvisActionCard
              key={action.key}
              action={action}
              onConfirm={() => onConfirm(message.id, action.key)}
              onCancel={() => onCancel(message.id, action.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}