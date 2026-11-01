import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { renderGuideHtml } from '../src/ui/features/docs/renderGuideHtml';
import { repoDocs } from './paths';

const VIRTUAL_ID = 'virtual:tracelens-guide-html';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/** Inline the TraceLens guide as HTML so the browser does not parse that chapter. */
export function tracelensGuideHtmlPlugin(): Plugin {
  const markdownPath = path.join(repoDocs, 'guide/tracelens.md');

  return {
    name: 'tracelens-guide-html',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      this.addWatchFile(markdownPath);
      const markdown = fs.readFileSync(markdownPath, 'utf8');
      const html = renderGuideHtml(markdown, 'guide');
      return `export const tracelensGuideHtml = ${JSON.stringify(html)};`;
    },
  };
}
