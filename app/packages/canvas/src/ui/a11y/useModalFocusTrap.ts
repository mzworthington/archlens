import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true'
  );
}

function isPresented(element: HTMLElement): boolean {
  if (element.inert || element.hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.classList.contains('invisible')) return false;
  return true;
}

/** Dialogs that are actually open and are not this trap (closed menus stay inert or invisible). */
function presentedForeignDialogs(container: HTMLElement): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(dialog => {
    if (dialog === container || container.contains(dialog) || dialog.contains(container)) {
      return false;
    }
    return isPresented(dialog);
  });
}

function containsFocus(element: HTMLElement): boolean {
  const active = document.activeElement;
  return active instanceof Node && (element === active || element.contains(active));
}

/**
 * A side panel yields while any dialog is open. A dialog yields only when focus
 * is already inside a different dialog, so two dialogs do not both refuse Escape.
 */
function shouldYield(container: HTMLElement): boolean {
  const foreign = presentedForeignDialogs(container);
  if (foreign.some(containsFocus)) return true;
  return foreign.length > 0 && container.getAttribute('role') !== 'dialog';
}

/**
 * Keep Tab inside `container` while `active`, and leave on Escape.
 * Restores the previously focused control when the trap turns off.
 */
export function useModalFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape: () => void
): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!shouldYield(container)) {
      const items = focusableWithin(container);
      (items[0] ?? container).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldYield(container)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const current = focusableWithin(container);
      if (current.length === 0) {
        event.preventDefault();
        return;
      }
      const first = current[0]!;
      const last = current[current.length - 1]!;
      const focused = document.activeElement;
      const inside = focused instanceof Node && container.contains(focused);
      if (event.shiftKey && (!inside || focused === first)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (!inside || focused === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef]);
}
