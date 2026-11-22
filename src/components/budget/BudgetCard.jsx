import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, CheckCircle2, Shield, Pencil, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORY_LABELS } from '@/lib/budgetUtils';
import ConfirmDelete from '@/components/shared/ConfirmDelete';

export default function BudgetCard({ budget, spent, moved = 0, onDelete, onEdit, onToggle }) {
  const isActive = budget.active !== false;
  const isSavingsLine = (budget.category || '').startsWith('Ladder: ');
  // On a Ladder line the funding is what was moved in, plus any stray payment,
  // and neither of them is ever added to the app's spending totals.
  const movedTotal = isSavingsLine ? Number(moved) || 0 : 0;
  const used = isSavingsLine ? movedTotal + spent : spent;
  const percentage = budget.amount > 0 ? Math.min((used / budget.amount) * 100, 100) : 0;
  const remaining = budget.amount - used;
  const isOver = isActive && remaining < 0;
  const isWarning = isActive && percentage >= 80 && !isOver;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`p-5 border-border transition-opacity ${isActive ? '' : 'opacity-60 bg-secondary/30'}`}>
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {budget.is_necessity && (
              <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-foreground text-sm truncate">{CATEGORY_LABELS[budget.category] || budget.category}</h4>
                {!isActive && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Pause className="w-3 h-3" /> Paused
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {budget.period || 'monthly'} budget · this {budget.period === 'weekly' ? 'week' : 'month'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isOver && <AlertTriangle className="w-4 h-4 text-money-out" />}
            {!isOver && !isWarning && isActive && <CheckCircle2 className="w-4 h-4 text-inflow" />}
            {isWarning && <AlertTriangle className="w-4 h-4 text-debt" />}
            <Switch checked={isActive} onCheckedChange={() => onToggle(budget)} aria-label="Pause or activate budget" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(budget)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <ConfirmDelete
              title="Delete this budget?"
              description={`The ${CATEGORY_LABELS[budget.category] || budget.category} budget will be removed. This cannot be undone.`}
              onConfirm={() => onDelete(budget.id)}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Delete budget">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              }
            />
          </div>
        </div>
        <Progress
          value={percentage}
          className={`h-2 mb-3 ${isOver ? '[&>div]:bg-money-out' : isWarning ? '[&>div]:bg-debt' : isSavingsLine ? '[&>div]:bg-money-moved' : '[&>div]:bg-inflow'}`}
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          {isSavingsLine ? (
            <span className="text-muted-foreground">
              <span className="font-medium tabular-nums text-money-moved">Moved {movedTotal.toLocaleString()}</span>
              {spent > 0 && (
                <span className="font-medium tabular-nums text-money-out"> · Paid {spent.toLocaleString()}</span>
              )}
              {' '}of <span className="tabular-nums">{budget.amount.toLocaleString()}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              <span className="font-medium tabular-nums text-money-out">KES {spent.toLocaleString()}</span>
              {' '}of <span className="tabular-nums">KES {budget.amount.toLocaleString()}</span>
            </span>
          )}
          <span className={`text-right font-medium tabular-nums ${isOver ? 'text-money-out' : isSavingsLine ? 'text-muted-foreground' : 'text-inflow'}`}>
            {isSavingsLine
              ? remaining > 0
                ? `${remaining.toLocaleString()} still to be funded`
                : remaining < 0
                  ? `KES ${Math.abs(remaining).toLocaleString()} over`
                  : 'Fully funded'
              : isOver ? `KES ${Math.abs(remaining).toLocaleString()} over` : `KES ${remaining.toLocaleString()} left`}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}