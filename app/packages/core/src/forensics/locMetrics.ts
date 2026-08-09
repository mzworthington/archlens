/** Strip block comments, preserving newlines for LOC counts (no regex / ReDoS). */
function stripBlockCommentsPreservingNewlines(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '/' && text[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        i++;
      }
      const end = i + 1 < text.length ? i + 2 : text.length;
      for (let j = start; j < end; j++) {
        result += text[j] === '\n' ? '\n' : '';
      }
      i = end;
      continue;
    }
    result += text[i];
    i++;
  }
  return result;
}

/** Physical LOC and source LOC (non-blank, non-comment-only lines). */
export function countLocAndSloc(text: string): { loc: number; sloc: number } {
  const withoutBlock = stripBlockCommentsPreservingNewlines(text);
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
