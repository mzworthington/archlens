/**
 * Filter feature-report Markdown (##+ headings + `-` list items) by query.
 * Keeps the leading intro; keeps ancestor headings of matches.
 */
export type FeatureFilterMode = 'text' | 'package';

export function filterFeatureMarkdown(
  markdown: string,
  query: string,
  mode: FeatureFilterMode = 'text'
): string {
  const q = query.trim().toLowerCase();
  if (!q) return markdown;

  const lines = markdown.split('\n');
  const intro: string[] = [];
  let i = 0;
  while (i < lines.length && headingLevel(lines[i]!) === 0) {
    intro.push(lines[i]!);
    i++;
  }

  type Node = {
    heading: string;
    level: number;
    items: string[];
    children: Node[];
  };

  const roots: Node[] = [];
  const stack: Node[] = [];

  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const heading = parseMarkdownHeading(line);
    if (heading) {
      const node: Node = {
        heading: heading.title,
        level: heading.level,
        items: [],
        children: [],
      };
      while (stack.length && stack[stack.length - 1]!.level >= node.level) {
        stack.pop();
      }
      if (stack.length === 0) {
        roots.push(node);
      } else {
        stack[stack.length - 1]!.children.push(node);
      }
      stack.push(node);
      continue;
    }
    if (stack.length && isMarkdownListItem(line)) {
      stack[stack.length - 1]!.items.push(line);
    }
  }

  function matchNode(node: Node): Node | null {
    if (mode === 'package') {
      // Only top-level ## package headings - exact title match, full subtree.
      return node.level === 2 && node.heading.toLowerCase() === q ? node : null;
    }

    const headingHit = node.heading.toLowerCase().includes(q);
    if (headingHit) {
      return node;
    }

    const items = node.items.filter(item => item.toLowerCase().includes(q));
    const children = node.children
      .map(child => matchNode(child))
      .filter((c): c is Node => c !== null);

    if (items.length === 0 && children.length === 0) return null;
    return { heading: node.heading, level: node.level, items, children };
  }

  function emit(node: Node, out: string[]): void {
    out.push(`${'#'.repeat(node.level)} ${node.heading}`);
    out.push(...node.items);
    for (const child of node.children) emit(child, out);
  }

  const out: string[] = [...intro];
  for (const root of roots) {
    const matched = matchNode(root);
    if (matched) emit(matched, out);
  }

  return `${collapseBlankLines(out.join('\n')).trimEnd()}\n`;
}

export function countFeatureMatches(
  markdown: string,
  query: string,
  mode: FeatureFilterMode = 'text'
): number {
  const q = query.trim().toLowerCase();
  if (!q) {
    return markdown.split('\n').filter(l => isMarkdownListItem(l)).length;
  }
  return filterFeatureMarkdown(markdown, query, mode)
    .split('\n')
    .filter(l => isMarkdownListItem(l)).length;
}

/** Top-level ## headings for an on-page outline. */
export function extractFeatureOutline(markdown: string): string[] {
  const headings: string[] = [];
  for (const line of markdown.split('\n')) {
    const heading = parseMarkdownHeading(line);
    if (heading?.level === 2) headings.push(heading.title);
  }
  return headings;
}

function headingLevel(line: string): number {
  return parseMarkdownHeading(line)?.level ?? 0;
}

function parseMarkdownHeading(line: string): { level: number; title: string } | undefined {
  let level = 0;
  while (level < line.length && line[level] === '#') level += 1;
  if (level < 2 || level > 6 || line[level] !== ' ') return undefined;
  return { level, title: line.slice(level + 1).trim() };
}

function isMarkdownListItem(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('- ');
}

function collapseBlankLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let blank = 0;
  for (const line of lines) {
    if (line === '') {
      blank += 1;
      if (blank < 2) out.push(line);
      continue;
    }
    blank = 0;
    out.push(line);
  }
  return out.join('\n');
}
