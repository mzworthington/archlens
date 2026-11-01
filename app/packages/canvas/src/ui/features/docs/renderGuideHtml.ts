import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { splitDocsMarkdown } from './presentDocsMarkdown';
import { stripHtmlComments } from './stripHtmlComments';
import {
  TRACELENS_DEMO_FILE,
  TRACELENS_POSTER_HEIGHT,
  TRACELENS_POSTER_SRC,
  TRACELENS_POSTER_WIDTH,
} from './tracelensDemo';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function headingId(text: string, counts: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const n = counts.get(base) ?? 0;
  counts.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

function propString(node: HastNode, key: string): string {
  const value = node.properties?.[key];
  return typeof value === 'string' ? value : '';
}

const IN_APP_PREFIXES = [
  '/guide',
  '/workspace',
  '/setup',
  '/tech-stack',
  '/architecture',
  '/privacy',
  '/journeys',
  '/design-system',
  '/chaoslens-engine',
  '/advicelens-engine',
  '/features-unit',
];

/**
 * Same join as resolveDocsHref, without loading the docs catalog.
 * The catalog import pulls every guide Markdown file, which the Vite config cannot resolve.
 */
function resolveInAppHref(href: string, fromDir: string): string | null {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^[a-z]+:/i.test(href)) {
    return null;
  }

  let target = href.split('#')[0] ?? href;
  if (target.endsWith('.html')) target = target.replace(/\.html$/, '');

  let joined: string;
  if (target.startsWith('/')) {
    joined = target.replace(/\/$/, '') || '/';
  } else {
    const baseSegments = fromDir ? fromDir.split('/').filter(Boolean) : [];
    for (const part of target.split('/')) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        baseSegments.pop();
        continue;
      }
      baseSegments.push(part);
    }
    joined = `/${baseSegments.join('/')}`.replace(/\.md$/, '').replace(/\/$/, '') || '/';
  }

  if (joined.endsWith('/index')) joined = joined.slice(0, -'/index'.length) || '/';
  if (joined.endsWith('/README') || joined === '/README') {
    joined = joined.replace(/\/?README$/, '') || '/';
  }

  if (
    joined === '/' ||
    IN_APP_PREFIXES.some(prefix => joined === prefix || joined.startsWith(`${prefix}/`))
  ) {
    return joined;
  }
  return null;
}

function fileName(src: string): string {
  const path = src.split('?')[0] ?? src;
  return path.slice(path.lastIndexOf('/') + 1);
}

function isTracelensGif(node: HastNode): boolean {
  return (
    node.type === 'element' &&
    node.tagName === 'img' &&
    fileName(propString(node, 'src')) === TRACELENS_DEMO_FILE
  );
}

function demoButton(image: HastNode): HastNode {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      className: ['docs-demo-still'],
      dataDemoFile: TRACELENS_DEMO_FILE,
      ariaLabel: 'Play TraceLens demo',
    },
    children: [
      {
        type: 'element',
        tagName: 'img',
        properties: {
          src: TRACELENS_POSTER_SRC,
          alt: propString(image, 'alt'),
          width: TRACELENS_POSTER_WIDTH,
          height: TRACELENS_POSTER_HEIGHT,
          className: ['docs-guide-shot'],
        },
        children: [],
      },
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['docs-demo-play'] },
        children: [{ type: 'text', value: 'Play demo' }],
      },
    ],
  };
}

function rewriteLink(node: HastNode, fromDir: string, counts: Map<string, number>): HastNode {
  const href = propString(node, 'href');
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const resolved = resolveInAppHref(href, fromDir);
  const properties = { ...(node.properties ?? {}) };
  if (resolved) {
    properties.href = `${resolved}${hash}`;
  } else if (href.startsWith('http://') || href.startsWith('https://')) {
    properties.target = '_blank';
    properties.rel = 'noreferrer';
  }
  return {
    ...node,
    properties,
    children: rewriteChildren(node.children ?? [], fromDir, counts),
  };
}

function rewriteChildren(
  children: HastNode[],
  fromDir: string,
  counts?: Map<string, number>
): HastNode[] {
  const headingCounts = counts ?? new Map<string, number>();
  const rewritten: HastNode[] = [];
  for (const child of children) {
    rewritten.push(...rewriteOne(child, fromDir, headingCounts));
  }
  return rewritten;
}

function rewriteOne(node: HastNode, fromDir: string, counts: Map<string, number>): HastNode[] {
  if (node.type === 'element' && node.tagName === 'p') {
    const significant = (node.children ?? []).filter(
      child => !(child.type === 'text' && !(child.value ?? '').trim())
    );
    const only = significant[0];
    if (significant.length === 1 && only && isTracelensGif(only)) {
      return [demoButton(only)];
    }
  }

  if (node.type === 'element' && node.tagName === 'table') {
    return [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['docs-table-wrap'] },
        children: [
          {
            ...node,
            children: rewriteChildren(node.children ?? [], fromDir, counts),
          },
        ],
      },
    ];
  }

  if (node.type === 'element' && node.tagName === 'a') {
    return [rewriteLink(node, fromDir, counts)];
  }

  if (node.type === 'element' && node.tagName && /^h[2-6]$/.test(node.tagName)) {
    const properties = { ...(node.properties ?? {}), id: headingId(textOf(node), counts) };
    return [
      {
        ...node,
        properties,
        children: rewriteChildren(node.children ?? [], fromDir, counts),
      },
    ];
  }

  if (node.children) {
    return [{ ...node, children: rewriteChildren(node.children, fromDir, counts) }];
  }
  return [node];
}

function rewriteTree(tree: HastNode, fromDir: string): void {
  tree.children = rewriteChildren(tree.children ?? [], fromDir);
}

/**
 * Guide chapter as HTML, built with the remark pipeline on the Node side.
 * The browser paints this string; it does not parse the Markdown on the main thread.
 */
export function renderGuideHtml(markdown: string, fromDir: string): string {
  const { body } = splitDocsMarkdown(stripHtmlComments(markdown));
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(() => (tree: HastNode) => {
      rewriteTree(tree, fromDir);
    })
    .use(rehypeStringify)
    .processSync(body);
  return String(file);
}
