import type { Plugin } from 'vite';

export type DeployIdentity = {
  sha: string;
  buildId: string;
};

export function resolveDeployIdentity(
  env: Record<string, string | undefined> = process.env
): DeployIdentity {
  const githubSha = env.GITHUB_SHA;
  if (githubSha) {
    return { sha: githubSha, buildId: githubSha.slice(0, 12) };
  }
  if (env.VITE_APP_BUILD_ID) {
    return { sha: env.VITE_APP_BUILD_ID, buildId: env.VITE_APP_BUILD_ID };
  }
  const local = `local-${Date.now().toString(36)}`;
  return { sha: local, buildId: local };
}

export function resolveBuildId(env: Record<string, string | undefined> = process.env): string {
  return resolveDeployIdentity(env).buildId;
}

export function serializeVersionJson(identity: DeployIdentity): string {
  return `${JSON.stringify({ sha: identity.sha, buildId: identity.buildId }, null, 2)}\n`;
}

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

/** Write `/version.json` into the Pages artifact for live SHA smoke checks. */
export function emitVersionJson(identity: DeployIdentity): Plugin {
  return {
    name: 'emit-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: serializeVersionJson(identity),
      });
    },
  };
}
