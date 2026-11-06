import tokensCss from 'virtual:archlens-design-tokens';
import type { DesignThemeId } from '../../infrastructure/theme/designTheme';

const SEMANTIC_TOKENS = ['canvas', 'surface', 'navy', 'ink', 'accent'] as const;

export type SemanticTokenName = (typeof SEMANTIC_TOKENS)[number];

function themeBlock(css: string, header: string): string {
  const start = css.indexOf(header);
  if (start < 0) {
    throw new Error(`Design token set is missing ${header}`);
  }
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`Design token set has an unclosed ${header}`);
}

function readHex(block: string, name: SemanticTokenName): string {
  const match = block.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  const hex = match?.[1];
  if (!hex) {
    throw new Error(`Design token set is missing --color-${name}`);
  }
  return hex.toLowerCase();
}

function readSet(block: string): Record<SemanticTokenName, string> {
  return {
    canvas: readHex(block, 'canvas'),
    surface: readHex(block, 'surface'),
    navy: readHex(block, 'navy'),
    ink: readHex(block, 'ink'),
    accent: readHex(block, 'accent'),
  };
}

/** Hex shown on the design-tokens page. The stylesheet is the only definition. */
export const DESIGN_THEME_TOKENS: Record<DesignThemeId, Record<SemanticTokenName, string>> = {
  blueprint: readSet(themeBlock(tokensCss, '@theme')),
  light: readSet(themeBlock(tokensCss, "html[data-theme='light']")),
};
