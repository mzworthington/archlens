import { describe, expect, it, beforeEach } from 'vitest';
import {
  credentialsForCollabRoom,
  saveCollabGuestSecret,
  stageCollabHostShare,
} from './collabRoomCredentials';

describe('collabRoomCredentials', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps a guest secret in memory and out of sessionStorage', () => {
    saveCollabGuestSecret('room-a', 's3cret');
    expect(sessionStorage.getItem('archlens.collab.guestSecret.room-a')).toBeNull();
    expect(credentialsForCollabRoom('room-a').secret).toBe('s3cret');
  });

  it('does not persist a host-share secret in sessionStorage', () => {
    stageCollabHostShare('room-b', {
      access: 'secret',
      secret: 'hosted-secret',
      expiresInHours: 8,
    });
    const raw = sessionStorage.getItem('archlens.collab.pendingClaim.room-b');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).secret).toBeUndefined();
    expect(credentialsForCollabRoom('room-b').claim?.secret).toBe('hosted-secret');
    expect(credentialsForCollabRoom('room-b').hostToken).toBeTruthy();
  });
});
