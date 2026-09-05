/**
 * Mermaid import facade - parse flowchart/C4 text into SystemSchema.
 * Implementation lives in sibling modules (shared, C4, flowchart, markdown).
 */
import {
  detectFormat,
  stripComments,
  type MermaidImportOptions,
  type MermaidParseResult,
} from './mermaidImportShared';
import { parseC4 } from './mermaidImportC4';
import { parseFlowchart } from './mermaidImportFlowchart';

export type {
  MermaidFormat,
  MermaidImportOptions,
  MermaidParseResult,
} from './mermaidImportShared';

export { extractMermaidFromMarkdown } from './mermaidImportMarkdown';

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
