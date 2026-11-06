export const DESIGN_THEME_KEY = 'archlens.design.theme';

export type DesignThemeId = 'blueprint' | 'light';

export const DESIGN_THEME_TOKENS: Record<
  DesignThemeId,
  { canvas: string; surface: string; navy: string; ink: string; accent: string }
> = {
  blueprint: {
    canvas: '#173453',
    surface: '#061125',
    navy: '#040914',
    ink: '#f3f4f6',
    accent: '#00f0ff',
  },
  light: {
    canvas: '#e8eef3',
    surface: '#ffffff',
    navy: '#d7e0e8',
    ink: '#152033',
    accent: '#0c6b78',
  },
};

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
