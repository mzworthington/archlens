export const DIAGRAM_LOADING_MESSAGE = 'Loading diagram...';
export const DIAGRAM_LAYOUT_MESSAGE = 'Arranging diagram...';
export const SANDBOX_LOADING_MESSAGE = 'Loading sandbox...';

export type DiagramLoadStoreSlice = {
  diagramLoadCount: number;
  isLoading: boolean | string;
};

export function beginDiagramLoad(
  get: () => DiagramLoadStoreSlice,
  set: (partial: Partial<DiagramLoadStoreSlice>) => void,
  message: string
): void {
  set({
    diagramLoadCount: get().diagramLoadCount + 1,
    isLoading: message,
  });
}

export function endDiagramLoad(
  get: () => DiagramLoadStoreSlice,
  set: (partial: Partial<DiagramLoadStoreSlice>) => void
): void {
  const next = Math.max(0, get().diagramLoadCount - 1);
  set({
    diagramLoadCount: next,
    ...(next === 0 ? { isLoading: false } : {}),
  });
}
