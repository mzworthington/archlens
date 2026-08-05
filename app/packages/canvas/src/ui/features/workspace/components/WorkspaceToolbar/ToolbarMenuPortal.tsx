import { createPortal } from 'react-dom';
import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';

type ToolbarMenuPlacement = 'menu-end' | 'above-start';

type ToolbarMenuPortalProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  menuClassName: string;
  children: ReactNode;
  /** How to position the menu relative to the anchor. */
  placement?: ToolbarMenuPlacement;
  /** When true (above-start), match the anchor width with a minimum width. */
  matchAnchorWidth?: boolean;
  minWidth?: number;
  role?: string;
};

/**
 * Renders toolbar dropdowns in a body portal so menus above the bottom bar
 * are not covered by the React Flow drag pane for pointer events.
 */
export function ToolbarMenuPortal({
  open,
  anchorRef,
  menuRef,
  menuClassName,
  children,
  placement = 'menu-end',
  matchAnchorWidth = false,
  minWidth = 320,
  role = 'menu',
}: ToolbarMenuPortalProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: minWidth });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      if (placement === 'above-start') {
        setCoords({
          top: rect.top - 8,
          left: rect.left,
          width: matchAnchorWidth ? Math.max(rect.width, minWidth) : minWidth,
        });
        return;
      }

      setCoords({
        top: rect.top - 8,
        left: rect.right,
        width: minWidth,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef, placement, matchAnchorWidth, minWidth]);

  if (!open) return null;

  const isAboveStart = placement === 'above-start';

  return createPortal(
    <div
      ref={menuRef}
      role={role}
      className={menuClassName}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        ...(isAboveStart ? { width: coords.width, transform: 'translateY(-100%)' } : {}),
        ...(!isAboveStart ? { transform: 'translate(-100%, -100%)' } : {}),
        zIndex: 1000,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
