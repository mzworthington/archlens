export const DESIGN_THEME_KEY = 'archlens.design.theme';

export type DesignThemeId = 'blueprint' | 'light';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readDesignTheme(storage: ReadableStorage | null): DesignThemeId {
  const raw = storage?.getItem(DESIGN_THEME_KEY);
  if (raw === 'light' || raw === 'blueprint') {
    return raw;
  }
  return 'blueprint';
}

export function writeDesignTheme(storage: WritableStorage | null, theme: DesignThemeId): void {
  storage?.setItem(DESIGN_THEME_KEY, theme);
}

export function applyDesignTheme(root: HTMLElement, theme: DesignThemeId): void {
  root.dataset.theme = theme;
}
