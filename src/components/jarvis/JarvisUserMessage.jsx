import { useState } from 'react';
import { formatClock } from '@/lib/jarvisClock';

export default function JarvisUserMessage({ message }) {
  const [showTime, setShowTime] = useState(false);

  return (
    <div className="jarvis-msg flex w-full flex-col items-end gap-1">
      <p
        onClick={() => setShowTime((value) => !value)}
        className="max-w-[85%] rounded-[14px] bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground"
      >
        {message.text}
      </p>
      {showTime && <span className="pr-1 text-[11px] text-muted-foreground">{formatClock(message.at)}</span>}
    </div>
  );
}