import type { MermaidFormat, MermaidImportOptions, MermaidParseResult } from './types';
import { stripComments } from './types';
import { parseC4 } from './c4';
import { parseFlowchart } from './flowchart';

export type { MermaidFormat, MermaidImportOptions, MermaidParseResult } from './types';
export { extractMermaidFromMarkdown } from './markdown';

function detectFormat(source: string): MermaidFormat {
  const trimmed = source.trim();
  if (/^C4Context\b/i.test(trimmed)) return 'c4-context';
  if (/^C4Container\b/i.test(trimmed)) return 'c4-container';
  if (/^C4Component\b/i.test(trimmed)) return 'c4-component';
  if (/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i.test(trimmed)) return 'flowchart';
  return 'unknown';
}

export function parseMermaidToSchema(
  mermaid: string,
  options: MermaidImportOptions
): MermaidParseResult {
  const source = stripComments(mermaid.trim());
  if (!source) {
    throw new Error('Mermaid input is empty.');
  }

  const format = detectFormat(source);
  if (format === 'unknown') {
    throw new Error(
      'Unrecognised or unsupported Mermaid diagram type. Supported: flowchart, graph, C4Context, C4Container, C4Component.'
    );
  }

  if (format.startsWith('c4-')) {
    return parseC4(source, format, options);
  }

  return parseFlowchart(source, options);
}
