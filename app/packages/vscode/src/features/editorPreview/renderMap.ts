import { EMPTY_MAP_COPY } from './domain';
import type { DiagramLink, DiagramSystem, DiagramView } from './ports';

const NODE_WIDTH = 256;
const NODE_MID_Y = 48;

const TYPE_LABEL: Record<string, string> = {
  person: 'Person',
  'software-system': 'Software System',
  group: 'Group',
  'web-app': 'Web App',
  'mobile-app': 'Mobile App',
  'single-page-app': 'Single Page App',
  microservice: 'Microservice',
  database: 'Database',
  'cache-store': 'Cache Store',
  'event-broker': 'Event Broker',
  'serverless-app': 'Serverless App',
  component: 'Component',
  'code-module': 'Code Module',
  'relational-database': 'Relational DB',
  'grpc-service': 'gRPC Service',
  'serverless-function': 'Serverless Fn',
  'rest-api': 'REST API',
  'gateway-api': 'Gateway API',
  'background-worker': 'Background Worker',
  container: 'Container',
};

const TYPE_BORDER: Record<string, string> = {
  person: 'rgba(236, 72, 153, 0.3)',
  'software-system': 'rgba(59, 130, 246, 0.3)',
  group: 'rgba(100, 116, 139, 0.3)',
  'web-app': 'rgba(6, 182, 212, 0.3)',
  'mobile-app': 'rgba(16, 185, 129, 0.3)',
  'single-page-app': 'rgba(20, 184, 166, 0.3)',
  microservice: 'rgba(139, 92, 246, 0.3)',
  database: 'rgba(244, 63, 94, 0.3)',
  'cache-store': 'rgba(249, 115, 22, 0.3)',
  'event-broker': 'rgba(168, 85, 247, 0.3)',
  'serverless-app': 'rgba(234, 179, 8, 0.3)',
  component: 'rgba(99, 102, 241, 0.3)',
  'code-module': 'rgba(203, 213, 225, 0.3)',
  'relational-database': 'rgba(6, 182, 212, 0.3)',
  'grpc-service': 'rgba(59, 130, 246, 0.3)',
  'serverless-function': 'rgba(234, 179, 8, 0.3)',
  'rest-api': 'rgba(16, 185, 129, 0.3)',
  'gateway-api': 'rgba(20, 184, 166, 0.3)',
  'background-worker': 'rgba(99, 102, 241, 0.3)',
  container: 'rgba(139, 92, 246, 0.3)',
};

export function renderMap(diagram: DiagramView, nonce: string): string {
  const placed = layout(diagram);
  const width = Math.max(640, ...placed.map(node => node.x + NODE_WIDTH + 80));
  const height = Math.max(480, ...placed.map(node => node.y + 160));
  const nodes = placed.map(node => systemCard(node.system, node.x, node.y)).join('\n');
  const edges = diagram.links
    .map(link => edge(link, placed))
    .filter(line => line.length > 0)
    .join('\n');
  const canvas = `<div class="canvas" data-canvas="architecture" style="width:${width}px;height:${height}px">
<svg class="edges" width="${width}" height="${height}">
${edges}
</svg>
${nodes}
</div>`;
  return page(
    `${breadcrumbNav(diagram.breadcrumb ?? [])}\n${canvas}\n${focusScript(nonce)}`,
    `script-src 'nonce-${escapeHtml(nonce)}';`
  );
}

function layout(diagram: DiagramView): { system: DiagramSystem; x: number; y: number }[] {
  const rank = new Map<string, number>();
  for (const system of diagram.systems) rank.set(system.entityRef, 0);
  for (let pass = 0; pass < diagram.systems.length; pass += 1) {
    for (const link of diagram.links) {
      const from =
        link.fromRef ?? diagram.systems.find(system => system.name === link.fromName)?.entityRef;
      const to =
        link.toRef ?? diagram.systems.find(system => system.name === link.toName)?.entityRef;
      if (!from || !to || !rank.has(from) || !rank.has(to)) continue;
      const next = (rank.get(from) ?? 0) + 1;
      if (next > (rank.get(to) ?? 0)) rank.set(to, next);
    }
  }
  const used = new Map<number, number>();
  return diagram.systems.map(system => {
    const saved = system.position;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      return { system, x: saved.x, y: saved.y };
    }
    const column = rank.get(system.entityRef) ?? 0;
    const row = used.get(column) ?? 0;
    used.set(column, row + 1);
    return { system, x: 40 + column * 320, y: 48 + row * 180 };
  });
}

function systemCard(system: DiagramSystem, x: number, y: number): string {
  const border = TYPE_BORDER[system.type ?? ''] ?? 'rgba(51, 65, 85, 0.9)';
  const dashed = system.external ? ';border-style:dashed' : '';
  const external = system.external ? ' data-external="true"' : '';
  const kind = TYPE_LABEL[system.type ?? ''];
  const kindLine = kind ? `<p class="kind">${escapeHtml(kind)}</p>\n  ` : '';
  const mark = system.hotspotCount === undefined ? '' : `<p>Hotspot</p>\n  `;
  const changes =
    system.hotspotCount === undefined
      ? ''
      : `<dt>Changes</dt>
    <dd>${system.hotspotCount}</dd>
    `;
  return `<article class="node" tabindex="0" data-entity-ref="${escapeHtml(system.entityRef)}" aria-label="${escapeHtml(system.name)}"${external} style="left:${x}px;top:${y}px;border-color:${border}${dashed}">
  ${kindLine}<h2>${escapeHtml(system.name)}</h2>
  ${mark}<dl>
    <dd>${escapeHtml(system.entityRef)}</dd>
    ${changes}</dl>
</article>`;
}

function edge(
  link: DiagramLink,
  nodes: readonly { system: DiagramSystem; x: number; y: number }[]
): string {
  const from = resolve(link.fromRef, link.fromName, nodes);
  const to = resolve(link.toRef, link.toName, nodes);
  if (!from || !to) return '';
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_MID_Y;
  const x2 = to.x;
  const y2 = to.y + NODE_MID_Y;
  return `<line data-from="${escapeHtml(from.system.entityRef)}" data-to="${escapeHtml(to.system.entityRef)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${escapeHtml(link.fromName)} → ${escapeHtml(link.toName)}</title></line>`;
}

function resolve(
  ref: string | undefined,
  name: string,
  nodes: readonly { system: DiagramSystem; x: number; y: number }[]
): { system: DiagramSystem; x: number; y: number } | undefined {
  if (ref) return nodes.find(node => node.system.entityRef === ref);
  return nodes.find(node => node.system.name === name);
}

function breadcrumbNav(breadcrumb: DiagramView['breadcrumb']): string {
  const crumbs = breadcrumb ?? [];
  if (crumbs.length < 2) return '';
  const items = crumbs
    .map((crumb, index) => {
      const label = escapeHtml(crumb.name);
      if (index === crumbs.length - 1) return `<span>${label}</span>`;
      return `<button type="button" data-crumb="${escapeHtml(crumb.sourcePath)}">${label}</button>`;
    })
    .join(' / ');
  return `<nav aria-label="Diagram">${items}</nav>`;
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
const nodeWidth = ${NODE_WIDTH};
const nodeMid = ${NODE_MID_Y};
let drag = null;
function moveEdges() {
  for (const line of document.querySelectorAll('line[data-from]')) {
    const from = document.querySelector('article[data-entity-ref="' + CSS.escape(line.getAttribute('data-from')) + '"]');
    const to = document.querySelector('article[data-entity-ref="' + CSS.escape(line.getAttribute('data-to')) + '"]');
    if (!from || !to) continue;
    line.setAttribute('x1', String(from.offsetLeft + nodeWidth));
    line.setAttribute('y1', String(from.offsetTop + nodeMid));
    line.setAttribute('x2', String(to.offsetLeft));
    line.setAttribute('y2', String(to.offsetTop + nodeMid));
  }
}
for (const article of document.querySelectorAll('article[data-entity-ref]')) {
  article.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { article, dx: event.clientX - article.offsetLeft, dy: event.clientY - article.offsetTop };
    article.setPointerCapture(event.pointerId);
  });
  article.addEventListener('pointermove', (event) => {
    if (!drag || drag.article !== article) return;
    article.style.left = Math.max(0, event.clientX - drag.dx) + 'px';
    article.style.top = Math.max(0, event.clientY - drag.dy) + 'px';
    moveEdges();
  });
  article.addEventListener('pointerup', () => { drag = null; });
  article.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    vscode.postMessage({ type: 'drill', entityRef: article.getAttribute('data-entity-ref') });
  });
}
window.addEventListener('keydown', (event) => {
  if (!event.altKey || event.key !== 'ArrowLeft') return;
  event.preventDefault();
  vscode.postMessage({ type: 'back' });
});
for (const crumb of document.querySelectorAll('[data-crumb]')) {
  crumb.addEventListener('click', () => {
    vscode.postMessage({ type: 'breadcrumb', sourcePath: crumb.getAttribute('data-crumb') });
  });
}
</script>`;
}

export type MapColorTheme = 'light' | 'system';

export function renderCanvasShell(input: {
  yaml: string;
  hotspots: boolean;
  nonce: string;
  scriptSrc: string;
  styleSrc: string;
  cspSource: string;
  theme?: MapColorTheme;
  blueprints?: readonly { name: string; content: string }[];
}): string {
  const csp = input.cspSource ? ` ${input.cspSource}` : '';
  const hotspots = input.hotspots ? 'on' : 'off';
  const yaml = JSON.stringify(input.yaml).replaceAll('<', '\\u003c');
  const blueprints = JSON.stringify(input.blueprints ?? []).replaceAll('<', '\\u003c');
  const theme = input.theme === 'system' ? 'system' : 'light';
  const systemTheme =
    theme === 'system'
      ? `<script nonce="${escapeHtml(input.nonce)}">
const scheme = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => {
  document.documentElement.dataset.theme = scheme.matches ? 'blueprint' : 'light';
};
applyTheme();
scheme.addEventListener('change', applyTheme);
</script>`
      : '';
  const keepNodeDrag = `<script nonce="${escapeHtml(input.nonce)}">
let lastClickAt = 0;
let lastClickElement = null;
let bridgingPointer = false;
const flowSurface = '.react-flow__node, .react-flow__pane, .react-flow__edge';
const flowChrome = '.react-flow__panel, .react-flow__controls, .react-flow__minimap';
function mouseInit(event) {
  return {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: event.clientX,
    clientY: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY,
    button: event.button,
    buttons: event.buttons,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
  };
}
function swallowTrustedMouse(event) {
  if (!bridgingPointer || !event.isTrusted) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}
window.addEventListener('mousedown', swallowTrustedMouse, true);
window.addEventListener('mousemove', swallowTrustedMouse, true);
window.addEventListener('mouseup', swallowTrustedMouse, true);
document.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !event.isPrimary) return;
  const target = event.target;
  const element = target instanceof Element ? target : target.parentElement;
  if (!element) return;
  if (element.closest(flowChrome)) return;
  if (!element.closest(flowSurface)) return;
  event.preventDefault();
  bridgingPointer = true;
  if (typeof element.setPointerCapture === 'function') {
    try { element.setPointerCapture(event.pointerId); } catch (captureError) { void captureError; }
  }
  const originX = event.clientX;
  const originY = event.clientY;
  element.dispatchEvent(new MouseEvent('mousedown', mouseInit(event)));
  const move = (pointerEvent) => {
    pointerEvent.preventDefault();
    element.dispatchEvent(new MouseEvent('mousemove', mouseInit(pointerEvent)));
  };
  const finish = (pointerEvent) => {
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerup', finish, true);
    document.removeEventListener('pointercancel', finish, true);
    bridgingPointer = false;
    pointerEvent.preventDefault();
    element.dispatchEvent(new MouseEvent('mouseup', mouseInit(pointerEvent)));
    if (pointerEvent.type === 'pointercancel') return;
    const dx = pointerEvent.clientX - originX;
    const dy = pointerEvent.clientY - originY;
    if (dx * dx + dy * dy > 16) return;
    const at = { bubbles: true, cancelable: true, clientX: pointerEvent.clientX, clientY: pointerEvent.clientY, view: window };
    element.dispatchEvent(new MouseEvent('click', at));
    const now = Date.now();
    if (lastClickElement === element && now - lastClickAt < 400) {
      element.dispatchEvent(new MouseEvent('dblclick', at));
    }
    lastClickAt = now;
    lastClickElement = element;
  };
  document.addEventListener('pointermove', move, true);
  document.addEventListener('pointerup', finish, true);
  document.addEventListener('pointercancel', finish, true);
}, true);
</script>`;
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src${csp} data: blob:; style-src${csp} 'unsafe-inline' https://fonts.googleapis.com; font-src${csp} https://fonts.gstatic.com; script-src 'nonce-${escapeHtml(input.nonce)}'${csp};" />
<link rel="stylesheet" href="${escapeHtml(input.styleSrc)}" />
<title>Architecture map</title>
<style>html,body,#root{height:100%;margin:0;} .react-flow__node,.react-flow__node *,.react-flow__pane,.react-flow__edge{user-select:none;-webkit-user-drag:none;touch-action:none;}</style>
</head>
<body data-hotspots="${hotspots}">
<div id="root"></div>
<script nonce="${escapeHtml(input.nonce)}" type="application/json" id="blueprint">${yaml}</script>
<script nonce="${escapeHtml(input.nonce)}" type="application/json" id="blueprints">${blueprints}</script>
${systemTheme}
${keepNodeDrag}
<script nonce="${escapeHtml(input.nonce)}" src="${escapeHtml(input.scriptSrc)}"></script>
</body>
</html>`;
}

function page(body: string, scriptSrc = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; ${scriptSrc}" />
<title>Architecture map</title>
<style>
  html, body { height: 100%; }
  body { font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; color: #f1f5f9; background: #020617; margin: 0; }
  nav { position: sticky; top: 0; z-index: 2; padding: 8px 12px; background: #020617; }
  button { color: #93c5fd; background: none; border: 0; padding: 0; cursor: pointer; }
  .canvas { position: relative; min-height: 100%; background-color: #020617; background-image: radial-gradient(#334155 1px, transparent 1px); background-size: 24px 24px; }
  .edges { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
  line { stroke: #64748b; stroke-width: 1.5; }
  .node { position: absolute; width:256px; box-sizing: border-box; border-radius: 12px; border: 1px solid #1e293b; background: #020617; padding: 16px; cursor: grab; }
  .node:active { cursor: grabbing; }
  .node:focus { outline: 1px solid #38bdf8; }
  .kind { margin: 0 0 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; }
  h2 { margin: 0; font-size: 16px; font-weight: 600; color: #f1f5f9; }
  dl { margin: 4px 0 0; }
  dd { margin: 0; font-family: ui-monospace, monospace; font-size: 12px; color: #e2e8f0; }
  dt { font-weight: 600; margin-top: 8px; }
  [data-external="true"] { border-style:dashed; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}
