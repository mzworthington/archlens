import React, { useEffect, useState } from 'react';

/** Mount children on first open; keep mounted so close animations and form state survive. */
export function LazyMountOnOpen({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  if (!mounted) return null;
  return <>{children}</>;
}
