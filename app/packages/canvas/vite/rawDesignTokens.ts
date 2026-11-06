import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:archlens-design-tokens';
const RESOLVED_ID = '\0virtual:archlens-design-tokens';

const tokensPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/ui/theme/tokens.css'
);

/** Expose tokens.css as a string. A CSS `?raw` import is emptied by the Tailwind plugin. */
export function rawDesignTokens(): Plugin {
  return {
    name: 'raw-design-tokens',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export default ${JSON.stringify(fs.readFileSync(tokensPath, 'utf8'))};`;
    },
  };
}
