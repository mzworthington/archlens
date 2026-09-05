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
