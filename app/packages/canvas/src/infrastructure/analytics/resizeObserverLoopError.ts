const RESIZE_OBSERVER_LOOP = /ResizeObserver loop/i;

export type CaptureLikeEvent = {
  event: string;
  properties?: Record<string, unknown>;
};

export type ErrorCaptureTarget = {
  onerror: OnErrorEventHandler;
  addEventListener(type: 'error', listener: (event: Event) => void, options?: boolean): void;
  removeEventListener(type: 'error', listener: (event: Event) => void, options?: boolean): void;
};

export function isResizeObserverLoopError(text: string): boolean {
  return RESIZE_OBSERVER_LOOP.test(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function exceptionTextsFromProperties(
  properties: Record<string, unknown> | undefined
): string[] {
  if (!properties) {
    return [];
  }
  const texts: string[] = [];
  if (typeof properties.$exception_message === 'string') {
    texts.push(properties.$exception_message);
  }
  const list = properties.$exception_list;
  if (!Array.isArray(list)) {
    return texts;
  }
  for (const item of list) {
    if (isRecord(item) && typeof item.value === 'string') {
      texts.push(item.value);
    }
  }
  return texts;
}

export function dropResizeObserverLoopExceptions<T extends CaptureLikeEvent>(
  event: T | null
): T | null {
  if (event === null || event.event !== '$exception') {
    return event;
  }
  if (exceptionTextsFromProperties(event.properties).some(isResizeObserverLoopError)) {
    return null;
  }
  return event;
}

function errorTextFromOnError(message: unknown, error: unknown): string {
  if (typeof message === 'string') {
    return message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (message instanceof ErrorEvent) {
    return message.message;
  }
  return '';
}

export function suppressResizeObserverLoopErrors(
  target: ErrorCaptureTarget = globalThis as typeof globalThis & ErrorCaptureTarget
): () => void {
  const previousOnError = target.onerror;
  const onError: OnErrorEventHandler = (message, source, lineno, colno, error) => {
    if (isResizeObserverLoopError(errorTextFromOnError(message, error))) {
      return true;
    }
    if (typeof previousOnError === 'function') {
      return previousOnError(message, source, lineno, colno, error);
    }
    return false;
  };
  target.onerror = onError;

  const onErrorEvent = (event: Event) => {
    if (!(event instanceof ErrorEvent) || !isResizeObserverLoopError(event.message)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  target.addEventListener('error', onErrorEvent, true);

  return () => {
    if (target.onerror === onError) {
      target.onerror = previousOnError;
    }
    target.removeEventListener('error', onErrorEvent, true);
  };
}
