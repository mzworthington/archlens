import { afterEach, describe, expect, it, vi } from 'vitest';
import { injectPrerenderedPageHtml } from './prerenderHtml';
import { resolvePageSeo } from './siteSeo';

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>ArchLens - Codebase Map Explorer</title>
    <meta name="description" content="shell" />
    <meta property="og:url" content="https://archlens.dev/" />
    <meta property="og:title" content="ArchLens - Codebase Map Explorer" />
    <meta property="og:description" content="shell" />
    <meta property="og:image" content="https://archlens.dev/assets/logo-dark.png" />
    <meta name="twitter:url" content="https://archlens.dev/" />
    <meta name="twitter:title" content="ArchLens - Codebase Map Explorer" />
    <meta name="twitter:description" content="shell" />
    <meta name="twitter:image" content="https://archlens.dev/assets/logo-dark.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('injectPrerenderedPageHtml', () => {
  it('rewrites head tags and injects crawlable body content inside #root', () => {
    const seo = resolvePageSeo('/guide/tracelens');
    const html = injectPrerenderedPageHtml(SHELL, seo, [
      { href: '/', label: 'ArchLens home' },
      { href: '/guide/chaoslens', label: 'ChaosLens' },
    ]);

    expect(html).toContain(`<title>${seo.title}</title>`);
    expect(html).toContain(`content="${seo.description}"`);
    expect(html).toContain(`href="${seo.canonicalUrl}"`);
    expect(html).toContain(seo.ogImageUrl);
    expect(html).toContain('application/ld+json');
    expect(html).toContain('id="root"');
    expect(html).toContain(`<h1>${seo.headline}</h1>`);
    expect(html).toContain(seo.description);
    expect(html).toContain('href="/guide/chaoslens"');
    expect(html).toContain('ArchLens home');
    expect(html).toContain('data-archlens-prerender="1"');
    expect(html).toContain('data-archlens-prerender-css');
    expect(html).toContain('data-archlens-prerender-boot');
    expect(html).toContain('data-archlens-booting');
    expect(html).toContain('al-prerender-eyebrow');
  });

  it('hides the booting shell from layout and focus, and shows it when the module fails', () => {
    const seo = resolvePageSeo('/');
    const html = injectPrerenderedPageHtml(SHELL, seo, [{ href: '/', label: 'ArchLens home' }]);
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const style = parsed.querySelector('style[data-archlens-prerender-css]');
    const boot = parsed.querySelector('script[data-archlens-prerender-boot]');
    const shell = parsed.querySelector('[data-archlens-prerender]');
    expect(style).not.toBeNull();
    expect(boot?.textContent).toBeTruthy();
    expect(shell).not.toBeNull();
    expect(style?.textContent).toContain('display:none !important');
    expect(style?.textContent).toContain('min-height:0 !important');
    expect(style?.textContent).not.toContain('clip:rect');

    document.head.append(style!);
    const root = document.createElement('div');
    root.id = 'root';
    root.append(shell!);
    document.body.append(root);
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.src = '/src/main.tsx';
    document.body.append(moduleScript);

    const listeners: Array<{ type: string; listener: EventListener; capture: boolean }> = [];
    const realAdd = window.addEventListener.bind(window);
    const spy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((type, listener, options) => {
        listeners.push({
          type: String(type),
          listener: listener as EventListener,
          capture: options === true,
        });
        realAdd(type, listener as EventListener, options);
      });

    const runBoot = new Function(boot!.textContent ?? '');
    runBoot();

    const liveShell = document.querySelector<HTMLElement>('[data-archlens-prerender]')!;
    const link = liveShell.querySelector('a')!;
    expect(document.documentElement.getAttribute('data-archlens-booting')).toBe('1');
    expect(getComputedStyle(liveShell).display).toBe('none');
    expect(getComputedStyle(liveShell).minHeight).toBe('0px');
    link.focus();
    expect(document.activeElement).not.toBe(link);

    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.href = '/favicon.svg';
    document.head.append(icon);
    icon.dispatchEvent(new Event('error', { bubbles: false }));
    expect(document.documentElement.getAttribute('data-archlens-booting')).toBe('1');

    moduleScript.dispatchEvent(new Event('error', { bubbles: false }));
    expect(document.documentElement.hasAttribute('data-archlens-booting')).toBe(false);
    expect(getComputedStyle(liveShell).display).not.toBe('none');
    link.focus();
    expect(document.activeElement).toBe(link);

    document.documentElement.setAttribute('data-archlens-booting', '1');
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('module eval failed') }));
    expect(document.documentElement.hasAttribute('data-archlens-booting')).toBe(false);

    for (const item of listeners) {
      window.removeEventListener(item.type, item.listener, item.capture);
    }
    spy.mockRestore();
    style!.remove();
    root.remove();
    moduleScript.remove();
    icon.remove();
    document.documentElement.removeAttribute('data-archlens-booting');
  });
});

afterEach(() => {
  document.documentElement.removeAttribute('data-archlens-booting');
});
