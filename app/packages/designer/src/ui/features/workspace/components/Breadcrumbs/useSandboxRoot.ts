import { useState } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { SandboxKind } from '../../../../../application/store/defaultData';
import { getSandboxKindLabel } from '../../../../../application/store/sandboxLabels';

export function useSandboxRoot() {
  const [, setLocation] = useLocation();
  const isWorkspaceOpen = useBlueprintStore(state => state.isWorkspaceOpen);
  const sandboxKind = useBlueprintStore(state => state.sandboxKind);
  const loadedSystems = useBlueprintStore(state => state.loadedSystems);
  const loadBundledSandbox = useBlueprintStore(state => state.loadBundledSandbox);

  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const activeKind: SandboxKind = sandboxKind ?? 'application';
  const showSandboxRoot = !isWorkspaceOpen && loadedSystems.length > 0;
  const siblingKinds = (['application', 'infrastructure'] as const).filter(
    kind => kind !== activeKind
  );

  const switchTo = async (kind: SandboxKind) => {
    if (kind === activeKind || switching) return;
    setSwitching(true);
    setMenuOpen(false);
    try {
      await loadBundledSandbox(kind);
      setLocation('/workspace/blueprint', { replace: true });
    } finally {
      setSwitching(false);
    }
  };

  return {
    showSandboxRoot,
    activeKind,
    activeLabel: getSandboxKindLabel(activeKind),
    siblingKinds,
    menuOpen,
    setMenuOpen,
    switching,
    switchTo,
  };
}
