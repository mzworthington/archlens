import { vi } from 'vitest';

export function installShowDirectoryPickerStub(): PropertyDescriptor | undefined {
  const originalPicker = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker');
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    value: vi.fn(),
  });
  return originalPicker;
}

export function restoreShowDirectoryPickerStub(
  originalPicker: PropertyDescriptor | undefined
): void {
  if (originalPicker) {
    Object.defineProperty(window, 'showDirectoryPicker', originalPicker);
    return;
  }
  Reflect.deleteProperty(window, 'showDirectoryPicker');
}
