/** Physical LOC and source LOC (non-blank, non-comment-only lines). */
export function countLocAndSloc(text: string): { loc: number; sloc: number } {
  const withoutBlock = text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ''));
  const lines = withoutBlock.split(/\r?\n/);
  let sloc = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//')) continue;
    sloc++;
  }
  return { loc: lines.length, sloc };
}
