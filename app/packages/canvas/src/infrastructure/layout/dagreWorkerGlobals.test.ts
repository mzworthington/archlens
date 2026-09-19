import { describe, expect, it } from 'vitest';
import { installDagreWorkerGlobals, type DagreWorkerGlobalScope } from './dagreWorkerGlobals';

/** Same branch dagre@0.8.5 uses in lib/lodash.js and lib/graphlib.js. */
function resolveDagreBrowserGlobal(scope: DagreWorkerGlobalScope, key: '_' | 'graphlib'): unknown {
  let value: unknown;
  if (typeof scope.require === 'function') {
    try {
      value = { bundled: true };
    } catch {
      /* dagre swallows require failures and falls through */
    }
  }
  if (!value) {
    value = (scope.window as Record<string, unknown> | undefined)?.[key];
  }
  return value;
}

describe('installDagreWorkerGlobals', () => {
  it('defines a require function on a scope that has none', () => {
    const scope: DagreWorkerGlobalScope = {};
    installDagreWorkerGlobals(scope);
    expect(typeof scope.require).toBe('function');
  });

  it('keeps an existing require untouched', () => {
    const existing = () => 'real';
    const scope: DagreWorkerGlobalScope = { require: existing };
    installDagreWorkerGlobals(scope);
    expect(scope.require).toBe(existing);
  });

  it('points window at the worker scope when it is missing', () => {
    const scope: DagreWorkerGlobalScope = {};
    installDagreWorkerGlobals(scope);
    expect(scope.window).toBe(scope);
  });

  it('keeps an existing window untouched', () => {
    const existing = { _: 'lodash' };
    const scope: DagreWorkerGlobalScope = { window: existing };
    installDagreWorkerGlobals(scope);
    expect(scope.window).toBe(existing);
  });

  it('keeps dagre on the bundled require path', () => {
    const scope: DagreWorkerGlobalScope = {};
    installDagreWorkerGlobals(scope);
    expect(resolveDagreBrowserGlobal(scope, '_')).toEqual({ bundled: true });
    expect(resolveDagreBrowserGlobal(scope, 'graphlib')).toEqual({ bundled: true });
  });

  it('reads window._ without throwing when require is not a function', () => {
    const scope: DagreWorkerGlobalScope = { require: 'not-a-function' };
    installDagreWorkerGlobals(scope);
    expect(() => resolveDagreBrowserGlobal(scope, '_')).not.toThrow();
    expect(() => resolveDagreBrowserGlobal(scope, 'graphlib')).not.toThrow();
  });
});
