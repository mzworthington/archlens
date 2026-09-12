import { afterEach, beforeEach, vi } from 'vitest';

export function stubDirectoryPicker(...args: [] | [unknown]): () => void {
  const value = args.length === 0 ? vi.fn() : args[0];
  const original = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker');
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    value,
  });
  return () => {
    if (original) {
      Object.defineProperty(window, 'showDirectoryPicker', original);
      return;
    }
    Reflect.deleteProperty(window, 'showDirectoryPicker');
  };
}

export function useDirectoryPickerStub(...args: [] | [unknown]): void {
  let restore = (): void => undefined;
  beforeEach(() => {
    restore = stubDirectoryPicker(...args);
  });
  afterEach(() => restore());
}
