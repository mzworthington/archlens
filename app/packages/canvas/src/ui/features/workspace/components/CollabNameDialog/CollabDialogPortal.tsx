import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/** Render collab dialogs on document.body so React Flow transforms cannot clip them. */
export function CollabDialogPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
