import type { LoggerPort } from '@archlens/core/logging';
import { noopLogger } from '@archlens/core/logging';
import type { WasmSimulationRequest, WasmSimulationResult } from '@archlens/core/resilience';

declare global {
  interface Window {
    Go?: new () => {
      importObject: WebAssembly.Imports;
      run: (instance: WebAssembly.Instance) => Promise<void>;
    };
    chaosLensSimulate?: (json: string) => string;
  }
}

export const RESILIENCE_WASM_BASE = '/resilience-engine';
export const RESILIENCE_WASM_PATH = `${RESILIENCE_WASM_BASE}/chaoslens.wasm`;
export const RESILIENCE_WASM_EXEC_PATH = `${RESILIENCE_WASM_BASE}/wasm_exec.js`;

let wasmReady: Promise<boolean> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    const timeout = window.setTimeout(() => {
      reject(new Error(`Timed out loading ${src}`));
    }, 5_000);
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

export async function initResilienceWasm(logger: LoggerPort = noopLogger): Promise<boolean> {
  if (typeof window === 'undefined' || typeof WebAssembly === 'undefined') return false;
  if (window.chaosLensSimulate) return true;
  if (wasmReady) return wasmReady;

  wasmReady = (async () => {
    try {
      const probe = await fetch(RESILIENCE_WASM_PATH, { method: 'HEAD' });
      if (!probe.ok) return false;

      await loadScript(RESILIENCE_WASM_EXEC_PATH);
      if (!window.Go) return false;

      const go = new window.Go();
      const response = await fetch(RESILIENCE_WASM_PATH);
      if (!response.ok) return false;

      const result = await WebAssembly.instantiateStreaming(response, go.importObject);
      void go.run(result.instance);
      return typeof window.chaosLensSimulate === 'function';
    } catch (err) {
      logger.warn('Failed to initialize ChaosLens WASM engine.', { error: err });
      return false;
    }
  })();

  return wasmReady;
}

export function isResilienceWasmReady(): boolean {
  return typeof window !== 'undefined' && typeof window.chaosLensSimulate === 'function';
}

export async function runResilienceWasmSimulation(
  request: WasmSimulationRequest,
  logger: LoggerPort = noopLogger
): Promise<WasmSimulationResult | null> {
  const ready = await initResilienceWasm(logger);
  if (!ready || !window.chaosLensSimulate) return null;

  const raw = window.chaosLensSimulate(JSON.stringify(request));
  const parsed = JSON.parse(raw) as WasmSimulationResult;
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}
