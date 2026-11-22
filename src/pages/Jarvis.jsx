import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import useJarvisVoice from '@/hooks/useJarvisVoice';
import JarvisHeaderDeck from '@/components/jarvis/JarvisHeaderDeck';
import JarvisThread from '@/components/jarvis/JarvisThread';
import JarvisComposer from '@/components/jarvis/JarvisComposer';
import CreditUsage from '@/components/jarvis/CreditUsage';

const CHIPS = ['How much can I spend today?', 'Log spending', 'How is my ladder?', 'Who owes me?'];
const INVITATION = 'Pesa iko aje leo, sir? Uliza kitu.';
const SPENT_KEYS = ['transactions', 'budgets', 'ladder-rungs', 'loans', 'debts-owed'];

const prune = (payload = {}) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined),
);

export default function Jarvis() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const voice = useJarvisVoice();
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [userTyping, setUserTyping] = useState(false);
  const [doneSettled, setDoneSettled] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  const historyRef = useRef([]);
  const hydratedRef = useRef(null);
  const typingTimerRef = useRef(null);

  const { data: savedRows, isLoading: loadingHistory } = useQuery({
    queryKey: ['jarvis-messages', user?.id],
    queryFn: async () => {
      const page = await api.entities.JarvisMessage.filter(
        { created_by_id: user.id },
        { sort: '-created_date', limit: 100 },
      );
      const items = Array.isArray(page) ? page : (page?.items || []);
      return [...items].reverse();
    },
    enabled: !!user?.id,
  });

  useEffect(() => () => clearTimeout(typingTimerRef.current), []);

  useEffect(() => {
    if (!user?.id || !savedRows || hydratedRef.current === user.id) return;
    hydratedRef.current = user.id;
    const restored = savedRows.map((row) => ({
      id: row.id,
      dbId: row.id,
      role: row.role,
      text: row.text,
      actions: Array.isArray(row.actions) ? row.actions : [],
      at: row.created_date,
      animate: false,
    }));
    setMessages(restored);
    historyRef.current = restored.slice(-8).map(({ role, text }) => ({ role, text }));
    if (restored[restored.length - 1]?.role === 'assistant') setDoneSettled(true);
  }, [user?.id, savedRows]);

  const syncSavedCache = useCallback((nextList) => {
    if (!user?.id) return;
    queryClient.setQueryData(
      ['jarvis-messages', user.id],
      nextList.map((m) => ({
        id: m.dbId || m.id,
        role: m.role,
        text: m.text,
        actions: m.actions || [],
        created_date: m.at,
      })),
    );
  }, [queryClient, user?.id]);

  const handleTyping = useCallback((active) => {
    clearTimeout(typingTimerRef.current);
    if (!active) {
      setUserTyping(false);
      return;
    }
    setUserTyping(true);
    setPulseTick((n) => n + 1);
    typingTimerRef.current = setTimeout(() => setUserTyping(false), 1800);
  }, []);

  const handleAssistantDone = useCallback((id) => {
    setStreamingId((current) => (current === id ? null : current));
    setDoneSettled(true);
  }, []);

  const jarvisTyping = busy || Boolean(streamingId) || voice.speaking;
  const waveMode = voice.listening
    ? 'listening'
    : jarvisTyping
      ? 'jarvis_typing'
      : userTyping
        ? 'user_typing'
        : doneSettled
          ? 'done'
          : 'idle';

  const status = voice.listening
    ? 'Listening'
    : busy
      ? 'Reading the ledger'
      : streamingId || voice.speaking
        ? 'Typing reply'
        : userTyping
          ? 'Tracking your pulse'
          : doneSettled
            ? 'Standing by'
            : 'Your money butler';

  const patchAction = useCallback((messageId, actionKey, patch, persist = false) => {
    setMessages((previous) => {
      let targetDbId = null;
      let updatedActions = null;
      const next = previous.map((message) => {
        if (message.id !== messageId) return message;
        targetDbId = message.dbId;
        updatedActions = (message.actions || []).map((action) => (
          action.key === actionKey ? { ...action, ...patch } : action
        ));
        return { ...message, actions: updatedActions };
      });
      syncSavedCache(next);
      if (persist && targetDbId && updatedActions) {
        api.entities.JarvisMessage.update(targetDbId, { actions: updatedActions });
      }
      return next;
    });
  }, [syncSavedCache]);

  const send = async (raw) => {
    const text = String(raw || '').trim();
    if (!text || busy) return;

    clearTimeout(typingTimerRef.current);
    setUserTyping(false);

    const stamp = Date.now();
    const userId = `u-${stamp}`;
    const userAt = new Date().toISOString();

    setMessages((previous) => {
      const next = [...previous, { id: userId, role: 'user', text, at: userAt, animate: false }];
      syncSavedCache(next);
      return next;
    });

    api.entities.JarvisMessage.create({ role: 'user', text }).then((saved) => {
      setMessages((previous) => {
        const next = previous.map((m) => (m.id === userId ? { ...m, dbId: saved.id } : m));
        syncSavedCache(next);
        return next;
      });
    });

    const history = historyRef.current.slice(-8);
    historyRef.current = [...history, { role: 'user', text }].slice(-8);
    setBusy(true);

    try {
      const response = await api.functions.invoke('jarvisChat', { message: text, history, voiceId: voice.voiceId });
      const data = response?.data || {};
      const reply = String(data.reply || '').trim() || 'I have nothing on that, sir.';
      const actions = (Array.isArray(data.proposed_actions) ? data.proposed_actions : []).map((action, index) => ({
        ...action,
        key: `a-${stamp}-${index}`,
        status: 'pending',
        receipt: '',
      }));

      const replyId = `j-${stamp}`;
      const replyAt = new Date().toISOString();
      setStreamingId(replyId);
      setMessages((previous) => {
        const next = [...previous, {
          id: replyId,
          role: 'assistant',
          text: reply,
          actions,
          at: replyAt,
          animate: true,
        }];
        syncSavedCache(next);
        return next;
      });

      api.entities.JarvisMessage.create({ role: 'assistant', text: reply, actions }).then((saved) => {
        setMessages((previous) => {
          const next = previous.map((m) => (m.id === replyId ? { ...m, dbId: saved.id } : m));
          syncSavedCache(next);
          return next;
        });
      });

      historyRef.current = [...historyRef.current, { role: 'assistant', text: reply }].slice(-8);
      // Speaking is opt-in. The hook re-checks a live ref as well, so no
      // ElevenLabs request (or character charge) happens while the switch is off.
      if (voice.speakOn) voice.speak(reply);
    } catch {
      setDoneSettled(true);
      setMessages((previous) => [...previous, {
        id: `e-${stamp}`,
        role: 'assistant',
        text: 'The ledger did not answer, sir. Try that again.',
        at: new Date().toISOString(),
        animate: false,
      }]);
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async (messageId, actionKey) => {
    const message = messages.find((item) => item.id === messageId);
    const action = (message?.actions || []).find((item) => item.key === actionKey);
    if (!action || action.status !== 'pending') return;

    patchAction(messageId, actionKey, { status: 'running' });
    try {
      const response = await api.functions.invoke('jarvisAct', {
        action: { type: action.type, payload: prune(action.payload), summary: action.summary },
      });
      const data = response?.data || {};
      if (data.error) throw new Error(data.error);
      patchAction(messageId, actionKey, { status: 'done', receipt: data.receipt || 'Done' }, true);
      SPENT_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    } catch (error) {
      const reason = error?.response?.data?.error || error?.message || 'That did not go through, sir.';
      patchAction(messageId, actionKey, { status: 'failed', receipt: reason }, true);
    }
  };

  const cancelAction = (messageId, actionKey) => {
    patchAction(messageId, actionKey, { status: 'cancelled' }, true);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100dvh-200px)] min-h-[440px] flex-col md:h-[calc(100dvh-150px)]">
      {loadingHistory && !hasMessages ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : (
        <JarvisHeaderDeck
          compact={hasMessages}
          mode={waveMode}
          status={status}
          pulseTick={pulseTick}
          invitation={INVITATION}
        />
      )}

      {hasMessages && (
        <JarvisThread
          messages={messages}
          busy={busy}
          onAssistantDone={handleAssistantDone}
          onConfirm={confirmAction}
          onCancel={cancelAction}
        />
      )}

      <JarvisComposer
        onSend={send}
        onTyping={handleTyping}
        busy={busy}
        chips={CHIPS}
        voice={voice}
        usage={<CreditUsage />}
      />
    </div>
  );
}