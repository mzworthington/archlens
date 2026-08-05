import React from 'react';

/** Animated blast-ripple ring overlay (full chrome only). */
export const BlueprintNodeBlastRipple: React.FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <span
      className="pointer-events-none absolute inset-0 rounded-xl blast-ripple-ring"
      aria-hidden
    />
  ) : null;
