import { useEffect, useRef } from 'react';
import { Link } from 'wouter';

type Props = {
  onGrant: () => void;
  onDeny: () => void;
};

export function AnalyticsConsentNotice({ onGrant, onDeny }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    try {
      if (!node.open) {
        node.showModal();
      }
    } catch {
      node.setAttribute('open', '');
    }
    return () => {
      try {
        if (node.open) {
          node.close();
        }
      } catch {
        node.removeAttribute('open');
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="analytics-consent-title"
      data-testid="analytics-consent-dialog"
      onCancel={event => event.preventDefault()}
      className="fixed inset-auto bottom-0 left-0 right-0 z-[70] m-0 w-full max-w-none border-0 bg-transparent p-0 text-slate-100 open:flex open:justify-center [&::backdrop]:bg-slate-950/55"
    >
      <div className="w-full border-t border-[#00f0ff]/25 bg-[#061125]/95 px-4 py-4 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h2 id="analytics-consent-title" className="text-sm font-semibold text-white">
              Help us improve ArchLens
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              We collect product analytics so we can see what is confusing and fix it: which pages
              people open, how Canvas is used, errors and session replay of the UI. Diagrams stay on
              your machine. If you opt in we use a cookie so repeat visits can be told apart. We do
              not look up your name or email.{' '}
              <Link href="/privacy" className="text-[#00f0ff] underline-offset-2 hover:underline">
                Privacy policy
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGrant}
              className="rounded-md border border-[#00f0ff]/40 bg-[#00f0ff]/90 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-[#00f0ff]"
            >
              Help improve ArchLens
            </button>
            <button
              type="button"
              onClick={onDeny}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-400 hover:text-white"
            >
              Don&apos;t track me
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
