import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const STEPS = [
  {
    id: 'dashboard',
    route: '/',
    selector: '[data-tour="nav-dashboard"]',
    emoji: '🏠',
    eyebrow: 'Home base',
    title: 'The Dashboard',
    body: 'Your money at a glance: wallet balances, money in, money out and where it went. If the numbers look strange, start here.',
    task: 'Tiny task: tap the glowing Dashboard link.',
  },
  {
    id: 'transactions',
    route: '/transactions',
    selector: '[data-tour="nav-transactions"]',
    emoji: '🧾',
    eyebrow: 'The ledger',
    title: 'Transactions',
    body: 'Every M-Pesa move lives here. Paste an export to import in bulk, or add a single entry by hand. Search and filters do the rest.',
    task: 'Tiny task: tap Transactions to open your ledger.',
  },
  {
    id: 'budget',
    route: '/budget',
    selector: '[data-tour="nav-budget"]',
    emoji: '🎯',
    eyebrow: 'Guardrails',
    title: 'Budget',
    body: 'Give each category a ceiling. MpesaTrack keeps score and Jarvis shouts when you get close — gently, usually.',
    task: 'Tiny task: open Budget and look for the create button.',
  },
  {
    id: 'ladder',
    route: '/ladder',
    selector: '[data-tour="nav-ladder"]',
    emoji: '🪜',
    eyebrow: 'The long game',
    title: 'Ladder',
    body: 'Break big savings goals into rungs. It starts empty on purpose — add your first rung when you have something worth climbing towards.',
    task: 'Tiny task: tap Ladder to see your rungs.',
  },
  {
    id: 'loans',
    route: '/loans',
    selector: '[data-tour="nav-loans"]',
    emoji: '🏦',
    eyebrow: 'What you owe',
    title: 'Loans',
    body: 'Track balances and repayment dates so a loan never sneaks up on you. Active and settled loans are kept apart.',
    task: 'Tiny task: open Loans.',
  },
  {
    id: 'debts-owed',
    route: '/debts-owed',
    selector: '[data-tour="nav-debts-owed"]',
    emoji: '🤝',
    eyebrow: 'What is owed to you',
    title: 'Owed to Me',
    body: 'The other side of the ledger. Record money people owe you, mark it settled, and spot the overdue ones.',
    task: 'Tiny task: tap Owed to Me.',
  },
  {
    id: 'analytics',
    route: '/analytics',
    selector: '[data-tour="nav-analytics"]',
    emoji: '📊',
    eyebrow: 'The bigger picture',
    title: 'Analytics',
    body: 'Monthly overviews, category breakdowns and budget versus actual. This is where patterns stop hiding.',
    task: 'Tiny task: open Analytics.',
  },
  {
    id: 'jarvis',
    route: '/jarvis',
    selector: '[data-tour="nav-jarvis"]',
    emoji: '🤖',
    eyebrow: 'Your assistant',
    title: 'Jarvis',
    body: 'Ask about your money in plain language. Jarvis can answer and, if you allow it, make careful changes for you. Speech is off until you switch it on.',
    task: 'Tiny task: say hello to Jarvis.',
  },
  {
    id: 'profile',
    route: '/profile',
    selector: '[data-tour="nav-profile"]',
    emoji: '👤',
    eyebrow: 'Your details',
    title: 'Profile',
    body: 'Your name, M-Pesa number and a verified backup email. That backup can rescue you if you lose access to your main inbox.',
    task: 'Tiny task: open Profile and check your backup email.',
  },
  {
    id: 'settings',
    route: '/settings',
    selector: '[data-tour="nav-settings"]',
    emoji: '⚙️',
    eyebrow: 'Control room',
    title: 'Settings',
    body: 'Switch between Dark and Paper, sign out, or wipe local data. You can also replay this tour from here whenever you like.',
    task: 'Tiny task: open Settings.',
  },
  {
    id: 'done',
    emoji: '🎉',
    eyebrow: 'Tour complete',
    title: 'You know the map',
    body: 'That is every panel. Nothing was changed while you looked around. Find “Replay tour” in Settings any time you need a refresher.',
    task: 'No task left — go make your money make sense.',
  },
];

const TourContext = createContext(null);
const storageKey = (userId) => `mpesatrack-tour-done:${userId || 'anon'}`;

function isVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0
    && rect.height > 0
    && style.visibility !== 'hidden'
    && style.display !== 'none'
    && style.opacity !== '0'
  );
}

export function useAppTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useAppTour must be used inside AppTourProvider');
  return context;
}

export default function AppTourProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const key = useMemo(() => storageKey(user?.id), [user?.id]);

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState(null);
  const [position, setPosition] = useState(() => ({
    left: Math.max(12, (window.innerWidth - 360) / 2),
    top: Math.max(12, (window.innerHeight - 260) / 2),
  }));
  const cardRef = useRef(null);
  const autoStarted = useRef(false);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = useCallback(() => {
    setActive(false);
    setIndex(0);
    try {
      localStorage.setItem(key, '1');
    } catch {
      // Private browsing can block storage; the tour still closes.
    }
  }, [key]);

  const startTour = useCallback(({ force = false } = {}) => {
    if (force) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage errors.
      }
    }
    setIndex(0);
    setActive(true);
  }, [key]);

  const next = useCallback(() => {
    if (index >= STEPS.length - 1) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
  }, [index, finish]);

  const previous = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  // First authenticated load after onboarding starts the tour once per device.
  useEffect(() => {
    if (!user?.id || autoStarted.current) return undefined;
    autoStarted.current = true;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === '1';
    } catch {
      seen = false;
    }
    if (seen) return undefined;
    const timer = window.setTimeout(() => setActive(true), 600);
    return () => window.clearTimeout(timer);
  }, [user?.id, key]);

  // Bring the panel being explained into view.
  useEffect(() => {
    if (!active || !step?.route || location.pathname === step.route) return;
    navigate(step.route);
  }, [active, step?.route, location.pathname, navigate]);

  // Tapping the highlighted menu item counts as completing the tiny task.
  useEffect(() => {
    if (!active || !step?.selector) return undefined;
    const handleClick = (event) => {
      const targets = Array.from(document.querySelectorAll(step.selector));
      if (targets.some((target) => target.contains(event.target))) {
        window.setTimeout(() => next(), 180);
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [active, step?.selector, next]);

  // Measure the spotlight target after each route change and on resize/scroll.
  useLayoutEffect(() => {
    if (!active) {
      setSpot(null);
      return undefined;
    }
    let frame = 0;
    const measure = () => {
      const targets = step?.selector ? Array.from(document.querySelectorAll(step.selector)) : [];
      const target = targets.find(isVisible);
      if (!target) {
        setSpot(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const padding = 8;
      setSpot({
        left: Math.max(4, rect.left - padding),
        top: Math.max(4, rect.top - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    };
    frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, step?.selector, location.pathname, index]);

  // Keep the explanation card near the spotlight but always on screen.
  useLayoutEffect(() => {
    if (!active || !cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = (viewportWidth - card.width) / 2;
    let top = (viewportHeight - card.height) / 2;

    if (spot && spot.width > 0) {
      left = Math.min(
        Math.max(12, spot.left + spot.width / 2 - card.width / 2),
        Math.max(12, viewportWidth - card.width - 12),
      );
      const below = spot.top + spot.height + 16;
      if (below + card.height <= viewportHeight - 12) top = below;
      else top = Math.max(12, spot.top - card.height - 16);
    }

    setPosition({ left: Math.round(left), top: Math.round(top) });
  }, [active, spot, index]);

  useEffect(() => {
    if (!active) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, finish, next, previous]);

  return (
    <TourContext.Provider value={{ startTour, finish, isActive: active, stepIndex: index, totalSteps: STEPS.length }}>
      {children}
      {active && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[80]" aria-live="polite">
          {spot ? (
            <div
              className="pointer-events-none fixed rounded-xl transition-all duration-300 ease-out"
              style={{
                left: spot.left,
                top: spot.top,
                width: spot.width,
                height: spot.height,
                boxShadow: '0 0 0 3px hsl(var(--ring) / 0.7), 0 0 0 9999px hsl(var(--tour-scrim))',
              }}
            />
          ) : (
            <div className="pointer-events-none fixed inset-0" style={{ background: 'hsl(var(--tour-scrim))' }} />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              ref={cardRef}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto fixed w-[min(360px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
              style={{ left: position.left, top: position.top }}
              role="dialog"
              aria-modal="true"
              aria-label={step.title}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden="true">{step.emoji}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{step.eyebrow}</p>
                    <h2 className="mt-0.5 font-heading text-lg font-bold text-foreground">{step.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finish}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Skip tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{step.task}</span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {index + 1} / {STEPS.length}
                </span>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={previous} className="gap-1 select-none">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                  )}
                  <Button type="button" size="sm" onClick={next} className="gap-1 select-none">
                    {isLast ? <Check className="h-3.5 w-3.5" /> : null}
                    {isLast ? 'Finish' : 'Got it'}
                    {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </TourContext.Provider>
  );
}
