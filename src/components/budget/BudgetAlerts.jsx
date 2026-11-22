import { AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const levelConfig = {
  over: {
    icon: XCircle,
    bg: 'bg-debt/10 border-debt/30',
    iconColor: 'text-debt',
    titleColor: 'text-debt',
    badge: 'bg-debt text-background',
    badgeLabel: 'Over budget',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-debt/5 border-debt/25',
    iconColor: 'text-debt',
    titleColor: 'text-debt',
    badge: 'bg-debt/20 text-debt',
    badgeLabel: 'Near limit',
  },
  halfway: {
    icon: Info,
    bg: 'bg-primary/5 border-primary/20',
    iconColor: 'text-primary',
    titleColor: 'text-primary',
    badge: 'bg-primary/15 text-primary',
    badgeLabel: 'Halfway',
  },
};

export default function BudgetAlerts({ alerts }) {
  const [dismissed, setDismissed] = useState(new Set());

  const visible = alerts.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wide text-muted-foreground">
        Smart Alerts
      </h2>
      <AnimatePresence>
        {visible.map((alert) => {
          const cfg = levelConfig[alert.level];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${cfg.titleColor}`}>{alert.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                    {cfg.badgeLabel}
                  </span>
                  {alert.is_necessity && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Necessity
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
              </div>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}