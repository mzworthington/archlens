import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useBlueprintStore } from '../../../application/store/store';

export const AppNotificationToast: React.FC = () => {
  const notification = useBlueprintStore(state => state.notification);
  const setNotification = useBlueprintStore(state => state.setNotification);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notification, setNotification]);

  if (!notification) return null;

  const tone =
    notification.type === 'success'
      ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200'
      : notification.type === 'info'
        ? 'bg-cyan-950/95 border-cyan-900/50 text-cyan-200'
        : notification.type === 'warning'
          ? 'bg-amber-950/95 border-amber-900/50 text-amber-200'
          : 'bg-red-950/95 border-red-900/50 text-red-200';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4"
      data-testid="app-notification-toast"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-xs shadow-2xl backdrop-blur-md ${tone}`}
      >
        {notification.type === 'success' ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : null}
        {notification.type === 'info' ? (
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
        ) : null}
        {notification.type === 'warning' ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        ) : null}
        {notification.type === 'error' ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        ) : null}
        <div className="min-w-0 flex-1">
          {notification.title ? <h5 className="mb-0.5 font-bold">{notification.title}</h5> : null}
          <p className="leading-relaxed">{notification.message}</p>
          {notification.actions && notification.actions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {notification.actions.map(action => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="rounded-md border border-current/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/10"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setNotification(null)}
          className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
