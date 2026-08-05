import type { Plugin } from 'vite';

/** Inject `<meta name="app-build-id">` for deploy-time version checks (index.html fetch). */
export function injectBuildIdMeta(appBuildId: string): Plugin {
  return {
    name: 'inject-build-id-meta',
    transformIndexHtml(html) {
      if (html.includes('name="app-build-id"')) return html;
      return html.replace(
        '<head>',
        `<head>\n    <meta name="app-build-id" content="${appBuildId}" />`
      );
    },
  };
}

export function resolveBuildId(): string {
  const fromCi = process.env.GITHUB_SHA?.slice(0, 12);
  if (fromCi) return fromCi;
  if (process.env.VITE_APP_BUILD_ID) return process.env.VITE_APP_BUILD_ID;
  return `local-${Date.now().toString(36)}`;
}
