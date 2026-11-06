import { EMPTY_MAP_MESSAGE } from '../../copy';
import { linkText, type DiagramView } from './openMap';

export type PreviewDocument = { kind: 'diagram'; view: DiagramView } | { kind: 'empty' };

export function renderPreviewDocument(preview: PreviewDocument, nonce: string): string {
  if (preview.kind === 'empty') {
    return documentShell({
      nonce,
      title: 'Architecture map',
      body: `<p>${EMPTY_MAP_MESSAGE}</p>`,
    });
  }
  const { view } = preview;
  const systems = view.systems
    .map(
      system =>
        `<li><button type="button" data-entity-ref="${escapeHtml(system.entityRef)}">${escapeHtml(system.name)}</button></li>`
    )
    .join('');
  const links = view.links.map(link => `<li>${escapeHtml(linkText(link))}</li>`).join('');
  const body = `
<h1>${escapeHtml(view.diagramName)}</h1>
<ul class="systems" aria-label="Systems">${systems}</ul>
<ul class="links" aria-label="Links">${links}</ul>
<section aria-label="Properties">
  <h2>Properties</h2>
  <dl>
    <dt>name</dt>
    <dd id="prop-name"></dd>
    <dt>entityRef</dt>
    <dd id="prop-entity-ref"></dd>
  </dl>
</section>
<script type="application/json" id="archlens-diagram">${jsonForHtml({ systems: view.systems })}</script>
<script nonce="${escapeHtml(nonce)}">
(function () {
  var payload = document.getElementById('archlens-diagram');
  var nameEl = document.getElementById('prop-name');
  var refEl = document.getElementById('prop-entity-ref');
  if (!payload || !nameEl || !refEl || !payload.textContent) return;
  var data = JSON.parse(payload.textContent);
  var buttons = document.querySelectorAll('button[data-entity-ref]');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('focus', function (event) {
      var button = event.currentTarget;
      if (!button || !button.getAttribute) return;
      var ref = button.getAttribute('data-entity-ref');
      var match;
      for (var j = 0; j < data.systems.length; j++) {
        if (data.systems[j].entityRef === ref) match = data.systems[j];
      }
      if (!match) return;
      nameEl.textContent = match.name;
      refEl.textContent = match.entityRef;
    });
  }
})();
</script>`;
  return documentShell({ nonce, title: view.diagramName, body });
}

function documentShell(input: { nonce: string; title: string; body: string }): string {
  const nonce = escapeHtml(input.nonce);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>${escapeHtml(input.title)}</title>
<style nonce="${nonce}">
body { font: 14px/1.4 var(--vscode-font-family, sans-serif); color: var(--vscode-foreground, #1e1e1e); background: var(--vscode-editor-background, #fff); margin: 16px; }
h1, h2 { font-size: 1.1rem; font-weight: 600; }
ul { list-style: none; padding: 0; margin: 0 0 16px; }
.systems { display: flex; flex-wrap: wrap; gap: 8px; }
.links { display: grid; gap: 4px; }
button { font: inherit; color: inherit; background: var(--vscode-button-secondaryBackground, #eee); border: 1px solid var(--vscode-panel-border, #ccc); border-radius: 4px; padding: 8px 12px; }
button:focus { outline: 2px solid var(--vscode-focusBorder, #005fb8); outline-offset: 2px; }
dt { font-weight: 600; }
dd { margin: 0 0 8px; }
</style>
</head>
<body>
${input.body}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}
