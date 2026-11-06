export type CollabShareAudience = 'same-browser' | 'joinable-link';

export function collabShareAudience(wsUrl: string | undefined): CollabShareAudience {
  return wsUrl?.trim() ? 'joinable-link' : 'same-browser';
}

export function collabShareAudienceCopy(audience: CollabShareAudience): string {
  if (audience === 'same-browser') {
    return 'This session only works in other tabs on this machine — it is not a public internet room.';
  }
  return 'Anyone with this link can join from another machine.';
}

export function collabShareLinkCopiedMessage(diagramCount: number): string {
  if (diagramCount > 1) {
    return 'Open this link in another tab. Everyone stays in this room and can switch diagrams.';
  }
  return 'Open this link in another tab to edit the diagram together.';
}
