import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function LadderBell({ notifications, onRead, onMarkAllRead }) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Notifications</span>
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-[10px] font-medium text-primary">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onRead(n)}
                className={`block w-full text-left px-3 py-2.5 border-b border-border/60 last:border-0 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <span className="text-[11px] font-semibold text-foreground truncate">{n.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
              </button>
            ))
          )}
        </div>
        <div className="px-3 py-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-[11px]" onClick={onMarkAllRead}>
            Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}