import type { SandboxKind } from './defaultData';

export const SANDBOX_ROOT_LABEL = 'Sandboxes';

export const SANDBOX_KIND_LABELS: Record<SandboxKind, string> = {
  application: 'Application',
  infrastructure: 'Infrastructure',
};

export function getSandboxKindLabel(kind: SandboxKind): string {
  return SANDBOX_KIND_LABELS[kind];
}
