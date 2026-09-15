import { describe, expect, it } from 'vitest';
import { installDagreWorkerRequireStub } from './dagreWorkerGlobals';

describe('installDagreWorkerRequireStub', () => {
  it('defines a require function on a scope that has none', () => {
    const scope: { require?: unknown } = {};
    installDagreWorkerRequireStub(scope);
    expect(typeof scope.require).toBe('function');
  });

  it('keeps an existing require untouched', () => {
    const existing = () => 'real';
    const scope: { require?: unknown } = { require: existing };
    installDagreWorkerRequireStub(scope);
    expect(scope.require).toBe(existing);
  });
});
