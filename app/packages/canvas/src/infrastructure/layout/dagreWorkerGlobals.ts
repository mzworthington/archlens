/**
 * Give the dagre Web Worker a `require` before dagre loads.
 *
 * dagre@0.8.5 bundles UMD copies of lodash and graphlib. Each module reads its
 * dependencies through `require` only when `typeof require === 'function'`, and
 * otherwise falls back to the browser globals `window._` and `window.graphlib`.
 * Vite bundles the main app so the `require` branch runs, but the worker build
 * leaves `require` as a bare global. A Worker has neither `require` nor
 * `window`, so the fallback runs and throws `ReferenceError: window is not
 * defined` while the module loads - before it handles a single message.
 * dagreWorkerClient then drops the worker, and every large diagram lays out on
 * the main thread instead of off it.
 *
 * Defining `require` makes dagre take the `require` branch and load the lodash
 * and graphlib copies already in this bundle - the same path the main thread
 * uses. dagre only reads `typeof require`; it never calls this stub for those
 * modules.
 *
 * Import this module before dagre so the stub exists when dagre evaluates.
 */
export function installDagreWorkerRequireStub(
  scope: { require?: unknown } = globalThis as { require?: unknown }
): void {
  scope.require ??= () => {
    throw new Error('require is not available inside the dagre layout worker');
  };
}

installDagreWorkerRequireStub();
