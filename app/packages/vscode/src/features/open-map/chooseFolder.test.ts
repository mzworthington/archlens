import { describe, expect, it } from 'vitest';
import { chooseMapFolder, isSamePath, resourceTarget } from './chooseFolder';

describe('isSamePath', () => {
  it('matches a Windows workspace root to the forward-slash path the map uses', () => {
    expect(isSamePath('C:\\repo', 'C:/repo')).toBe(true);
    expect(isSamePath('C:\\repo\\', 'C:/repo')).toBe(true);
  });

  it('does not treat a different folder as the same root', () => {
    expect(isSamePath('C:\\repo', 'C:/repo-other')).toBe(false);
    expect(isSamePath('/repo', '/repo/blueprints')).toBe(false);
  });

  it('matches the folder path returned for a Windows workspace root', () => {
    const choice = chooseMapFolder({
      workspaceFolders: ['C:\\billing', 'C:\\checkout'],
      invokedPath: 'C:\\checkout\\blueprints',
    });
    expect(choice).toEqual({ kind: 'folder', path: 'C:/checkout' });
    if (choice.kind !== 'folder') return;
    expect(isSamePath(choice.path, 'C:\\checkout')).toBe(true);
    expect(isSamePath(choice.path, 'C:\\billing')).toBe(false);
  });
});

describe('resourceTarget', () => {
  it('locates an explorer folder without selecting it as a blueprint file', () => {
    expect(resourceTarget('C:\\checkout\\blueprints')).toEqual({
      locatePath: 'C:\\checkout\\blueprints',
    });
    expect(resourceTarget('/checkout/blueprints')).toEqual({ locatePath: '/checkout/blueprints' });
  });

  it('selects a blueprint file the command was invoked on', () => {
    expect(resourceTarget('/repo/blueprints/context.yaml')).toEqual({
      blueprintPath: '/repo/blueprints/context.yaml',
      locatePath: '/repo/blueprints/context.yaml',
    });
    expect(resourceTarget('/repo/blueprints/context.yml')).toEqual({
      blueprintPath: '/repo/blueprints/context.yml',
      locatePath: '/repo/blueprints/context.yml',
    });
  });

  it('ignores a missing resource so the active editor can choose the folder', () => {
    expect(resourceTarget(undefined)).toEqual({});
  });
});
