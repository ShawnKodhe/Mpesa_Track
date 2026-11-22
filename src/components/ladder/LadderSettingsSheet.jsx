import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

const RULES = [
  { key: 'monthly_reminder', label: 'Monthly contribution reminder', hint: 'A nudge on the 1st for the active rung' },
  { key: 'deadline_alert', label: 'Deadline alerts', hint: '14 days and 3 days before a rung is due' },
  { key: 'behind_pace', label: 'Behind-pace warning', hint: 'When the last 30 days fall short of the plan' },
  { key: 'completion_notice', label: 'Completion notice', hint: 'When a rung reaches its target' },
];

export default function LadderSettingsSheet({ open, onOpenChange, settings, onToggle }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Ladder settings</SheetTitle>
          <SheetDescription>Choose which reminders you get.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-1 pb-6">
          {RULES.map((rule) => (
            <div key={rule.key} className="flex items-center justify-between gap-3 py-2.5 border-b border-border/60 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{rule.label}</p>
                <p className="text-[11px] text-muted-foreground">{rule.hint}</p>
              </div>
              <Switch
                checked={settings[rule.key] !== false}
                onCheckedChange={(value) => onToggle(rule.key, value)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}