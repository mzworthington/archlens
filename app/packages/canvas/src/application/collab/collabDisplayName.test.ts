import { describe, expect, it, beforeEach } from 'vitest';
import {
  getCollabPrefillDisplayName,
  getCollabSessionDisplayName,
  setCollabDisplayName,
  subscribeCollabDisplayName,
} from './collabDisplayName';

describe('collabDisplayName', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('stores a session name and prefills later visits from localStorage', () => {
    expect(setCollabDisplayName('  Ada  ')).toBe('Ada');
    expect(getCollabSessionDisplayName()).toBe('Ada');
    expect(localStorage.getItem('archlens.collab.displayName')).toBe('Ada');

    sessionStorage.clear();
    expect(getCollabSessionDisplayName()).toBeNull();
    expect(getCollabPrefillDisplayName()).toBe('Ada');
  });

  it('rejects an invalid name without writing storage', () => {
    expect(setCollabDisplayName('   ')).toBeNull();
    expect(getCollabSessionDisplayName()).toBeNull();
    expect(localStorage.getItem('archlens.collab.displayName')).toBeNull();
  });

  it('notifies subscribers when a name is saved', () => {
    let calls = 0;
    const unsubscribe = subscribeCollabDisplayName(() => {
      calls += 1;
    });
    setCollabDisplayName('Grace');
    unsubscribe();
    setCollabDisplayName('Ada');
    expect(calls).toBe(1);
  });
});
