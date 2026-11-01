import React from 'react';
import { useLocation } from 'wouter';
import { docsScreenshotSrc } from './docsAssetSrc';
import { TRACELENS_POSTER_HEIGHT, TRACELENS_POSTER_WIDTH } from './tracelensDemo';

type Props = {
  html: string;
};

function playDemo(button: HTMLButtonElement): void {
  const file = button.dataset.demoFile;
  if (!file) return;
  const poster = button.querySelector('img');
  const img = document.createElement('img');
  img.src = docsScreenshotSrc(file);
  img.alt = poster?.alt ?? '';
  img.width = TRACELENS_POSTER_WIDTH;
  img.height = TRACELENS_POSTER_HEIGHT;
  img.className = 'docs-guide-shot';
  button.replaceWith(img);
}

/**
 * Pre-rendered guide HTML. Internal links stay in the app router.
 * The TraceLens capture stays a still until the reader plays it, so the GIF
 * is not on the load path.
 */
export const StaticDocsArticle: React.FC<Props> = ({ html }) => {
  const [, setLocation] = useLocation();

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const demo = target.closest('[data-demo-file]');
    if (demo instanceof HTMLButtonElement) {
      event.preventDefault();
      playDemo(demo);
      return;
    }

    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target === '_blank') return;
    const href = anchor.getAttribute('href');
    if (!href || /^[a-z]+:/i.test(href)) return;
    event.preventDefault();
    setLocation(href);
  };

  return (
    <div
      className="docs-prose docs-prose-static"
      onClick={onClick}
      // HTML is produced at build time from the repo's guide Markdown, not from readers.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
