import { describe, expect, it } from 'vitest';
import { collectBrowserFileMetrics } from './collectBrowserFileMetrics';

describe('collectBrowserFileMetrics', () => {
  it('classifies a frequently changed complex file as a hotspot', async () => {
    const sources = [
      {
        relativePath: 'src/hot.ts',
        content: `
          export function run(x: number) {
            if (x > 1) {
              for (const n of [1, 2, 3]) {
                if (n) return n;
              }
            }
            while (x) {
              if (x < 0) break;
              x -= 1;
            }
            return x;
          }
        `,
      },
      { relativePath: 'src/cold.ts', content: 'export const n = 1;\n' },
    ];
    const now = new Date();
    const commits = [
      { hash: '1', authorEmail: 'a@ex.com', authorDate: now, paths: ['src/hot.ts'] },
      { hash: '2', authorEmail: 'b@ex.com', authorDate: now, paths: ['src/hot.ts'] },
      { hash: '3', authorEmail: 'c@ex.com', authorDate: now, paths: ['src/hot.ts'] },
      { hash: '4', authorEmail: 'a@ex.com', authorDate: now, paths: ['src/cold.ts'] },
    ];

    const byPath = await collectBrowserFileMetrics({ sources, commits });
    const hot = byPath.get('src/hot.ts');
    expect(hot?.classifications).toContain('hotspot');
    expect(hot?.churn).toBe(3);
    expect(byPath.get('src/cold.ts')?.classifications).not.toContain('hotspot');
  });

  it('still counts loc when git history is empty so the map matches a gitless CLI scan', async () => {
    const byPath = await collectBrowserFileMetrics({
      sources: [{ relativePath: 'src/a.ts', content: 'export const a = 1;' }],
      commits: [],
    });
    expect(byPath.get('src/a.ts')?.loc).toBe(1);
    expect(byPath.get('src/a.ts')?.classifications).not.toContain('hotspot');
  });
});
