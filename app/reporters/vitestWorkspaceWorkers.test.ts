import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('vitest workspace worker budget', () => {
  it('gives file projects the same CI maxWorkers as the workspace root', () => {
    const scriptPath = path.join(os.tmpdir(), `archlens-vitest-workers-${process.pid}.mts`);
    const script = `
      import path from 'node:path';
      import { pathToFileURL } from 'node:url';
      const appRoot = ${JSON.stringify(appRoot)};
      const root = (await import(pathToFileURL(path.join(appRoot, 'vitest.config.ts')).href)).default;
      const rootWorkers = root.test?.maxWorkers;
      if (rootWorkers !== '100%') {
        throw new Error('root maxWorkers is ' + String(rootWorkers));
      }
      const files = root.test.projects.filter((project) => typeof project === 'string');
      for (const file of files) {
        const project = (await import(pathToFileURL(path.resolve(appRoot, file)).href)).default;
        const workers = project.test?.maxWorkers;
        if (workers !== rootWorkers) {
          throw new Error(file + ' maxWorkers is ' + String(workers));
        }
      }
    `;
    fs.writeFileSync(scriptPath, script);
    try {
      execFileSync('pnpm', ['exec', 'tsx', scriptPath], {
        cwd: appRoot,
        env: { ...process.env, CI: '1' },
        stdio: 'pipe',
      });
    } finally {
      fs.rmSync(scriptPath, { force: true });
    }
  });
});
