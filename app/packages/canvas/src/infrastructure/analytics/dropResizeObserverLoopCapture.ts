import { isBenignServiceWorkerUpdateFailureMessage } from '../../application/pwa/benignServiceWorkerUpdateFailure';

export type PostHogCaptureResult = {
  event: string;
  properties?: Record<string, unknown>;
};

function isResizeObserverLoopMessage(message: string): boolean {
  return /ResizeObserver loop/i.test(message);
}

export function dropBenignBrowserExceptionCapture<T extends PostHogCaptureResult>(
  capture: T | null
): T | null {
  return dropIfExceptionMessage(
    dropResizeObserverLoopCapture(capture),
    isBenignServiceWorkerUpdateFailureMessage
  );
}

export function dropResizeObserverLoopCapture<T extends PostHogCaptureResult>(
  capture: T | null
): T | null {
  return dropIfExceptionMessage(capture, isResizeObserverLoopMessage);
}

function dropIfExceptionMessage<T extends PostHogCaptureResult>(
  capture: T | null,
  isNoise: (message: string) => boolean
): T | null {
  if (capture == null) {
    return null;
  }
  if (capture.event !== '$exception') {
    return capture;
  }
  if (exceptionMessages(capture.properties).some(isNoise)) {
    return null;
  }
  return capture;
}

function exceptionMessages(properties: Record<string, unknown> | undefined): string[] {
  if (properties == null) {
    return [];
  }
  const messages: string[] = [];
  const top = properties.$exception_message;
  if (typeof top === 'string') {
    messages.push(top);
  }
  const list = properties.$exception_list;
  if (!Array.isArray(list)) {
    return messages;
  }
  for (const item of list) {
    if (!isStringRecord(item)) {
      continue;
    }
    if (typeof item.value === 'string') {
      messages.push(item.value);
    }
    if (typeof item.type === 'string') {
      messages.push(item.type);
    }
  }
  return messages;
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
