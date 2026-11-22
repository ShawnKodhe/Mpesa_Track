import { useEffect, useRef } from 'react';
import JarvisAssistantMessage from './JarvisAssistantMessage';
import JarvisUserMessage from './JarvisUserMessage';
import JarvisDots from './JarvisDots';

export default function JarvisThread({ messages, busy, onAssistantDone, onConfirm, onCancel }) {
  const scrollerRef = useRef(null);

  const follow = () => {
    const element = scrollerRef.current;
    if (!element) return;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 240) {
      element.scrollTop = element.scrollHeight;
    }
  };

  useEffect(() => {
    const element = scrollerRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, busy]);

  return (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-0.5 pb-2"
      role="log"
      aria-live="polite"
    >
      {messages.map((message) => (message.role === 'user' ? (
        <JarvisUserMessage key={message.id} message={message} />
      ) : (
        <JarvisAssistantMessage
          key={message.id}
          message={message}
          onGrow={follow}
          onDone={onAssistantDone}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )))}

      {busy && (
        <div className="jarvis-msg flex w-full items-center">
          <div className="glass-bar rounded-[14px] px-3.5 py-3">
            <JarvisDots label="Jarvis is reading your ledger" />
          </div>
        </div>
      )}
    </div>
  );
}