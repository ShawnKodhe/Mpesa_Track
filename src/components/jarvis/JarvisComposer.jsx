import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Mic, Square } from 'lucide-react';
import JarvisVoiceControls from './JarvisVoiceControls';

const BARS = [0, 1, 2, 3];

export default function JarvisComposer({ onSend, onTyping, busy, chips = [], voice, usage }) {
  const [value, setValue] = useState('');
  const areaRef = useRef(null);
  const appliedRef = useRef('');

  useEffect(() => {
    if (!voice.transcript || voice.transcript === appliedRef.current) return;
    appliedRef.current = voice.transcript;
    setValue(voice.transcript);
    onTyping?.(Boolean(voice.transcript.trim()));
    areaRef.current?.focus();
  }, [voice.transcript, onTyping]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 132)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onTyping?.(false);
    onSend(text);
    setValue('');
    appliedRef.current = '';
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 space-y-2 border-t border-border/70 pt-3">
      {voice.note && (
        <p className="text-xs leading-snug text-destructive">{voice.note}</p>
      )}

      {voice.listening && (
        <div className="flex items-center gap-2 text-primary">
          <span className="jarvis-wave">
            {BARS.map((bar) => <span key={bar} style={{ animationDelay: `${bar * 0.12}s` }} />)}
          </span>
          <span className="text-xs font-medium">Listening. Speak, then edit before sending.</span>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSend(chip)}
            disabled={busy}
            className="shrink-0 rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 rounded-[14px] border border-border bg-card px-2 py-1.5 shadow-card">
        <button
          type="button"
          onClick={voice.listening ? voice.stopListening : voice.startListening}
          aria-label={voice.listening ? 'Stop dictating' : 'Dictate a message'}
          aria-pressed={voice.listening}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
            voice.listening ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent'
          }`}
        >
          {voice.listening
            ? <Square className="h-4 w-4" aria-hidden="true" />
            : <Mic className="h-4 w-4" aria-hidden="true" />}
        </button>

        <textarea
          ref={areaRef}
          rows={1}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            onTyping?.(Boolean(next.trim()));
          }}
          onBlur={() => onTyping?.(false)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Jarvis, or tell him what you spent"
          aria-label="Message Jarvis"
          className="max-h-[132px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
        />

        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          aria-label="Send to Jarvis"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {busy
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pb-1 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <JarvisVoiceControls voice={voice} />
          {usage}
        </div>
        <span className="hidden text-right sm:inline">
          {voice.listening
            ? 'Dictating'
            : voice.supported
              ? 'Dictate, then edit before sending'
              : 'Typing only on this device'}
        </span>
      </div>
    </div>
  );
}