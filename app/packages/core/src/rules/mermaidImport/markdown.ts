export function extractMermaidFromMarkdown(content: string): string {
  const open = '```mermaid';
  const lower = content.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < content.length) {
    const start = lower.indexOf(open, searchFrom);
    if (start === -1) {
      break;
    }

    let i = start + open.length;
    let validOpen = false;
    while (i < content.length) {
      const c = content[i];
      if (c === ' ' || c === '\t' || c === '\r') {
        i++;
        continue;
      }
      if (c === '\n') {
        i++;
        validOpen = true;
        break;
      }
      break;
    }

    if (!validOpen) {
      searchFrom = start + open.length;
      continue;
    }

    const closeIdx = content.indexOf('```', i);
    if (closeIdx === -1) {
      break;
    }

    return content.slice(i, closeIdx).trim();
  }

  return content.trim();
}
