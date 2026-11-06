import { EMPTY_MAP_COPY } from './domain';
import type { DiagramView } from './ports';

export function renderMap(diagram: DiagramView, nonce: string): string {
  const systems = diagram.systems
    .map(
      system => `<article tabindex="0" data-entity-ref="${escapeHtml(system.entityRef)}" aria-label="${escapeHtml(system.name)}">
  <h2>${escapeHtml(system.name)}</h2>
  <dl>
    <dt>Name</dt>
    <dd>${escapeHtml(system.name)}</dd>
    <dt>entityRef</dt>
    <dd>${escapeHtml(system.entityRef)}</dd>
  </dl>
</article>`
    )
    .join('\n');
  const links = diagram.links
    .map(link => `<li>${escapeHtml(link.fromName)} → ${escapeHtml(link.toName)}</li>`)
    .join('\n');
  return page(
    `${systems}\n<ul>\n${links}\n</ul>\n${focusScript(nonce)}`,
    `script-src 'nonce-${escapeHtml(nonce)}';`
  );
}

export function renderEmptyMap(): string {
  return page(`<p>${escapeHtml(EMPTY_MAP_COPY)}</p>`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function focusScript(nonce: string): string {
  return `<script nonce="${escapeHtml(nonce)}">
const vscode = acquireVsCodeApi();
for (const article of document.querySelectorAll('article[data-entity-ref]')) {
  article.addEventListener('focus', () => {
    vscode.postMessage({ type: 'focus-system', entityRef: article.getAttribute('data-entity-ref') });
  });
}
</script>`;
}

function page(body: string, scriptSrc = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; ${scriptSrc}" />
<title>Architecture map</title>
<style>
  body { font: 13px/1.4 var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); margin: 16px; }
  article { border: 1px solid var(--vscode-panel-border); padding: 8px 12px; margin: 0 0 8px; }
  article:focus { outline: 1px solid var(--vscode-focusBorder); }
  dt { font-weight: 600; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}
