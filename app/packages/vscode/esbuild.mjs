import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'esm',
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info',
});
