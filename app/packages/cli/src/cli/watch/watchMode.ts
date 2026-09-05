import path from 'node:path';

export interface WatchModeOptions {
  scanRoot: string;
  outputDir: string;
  debounceMs: number;
}

/** Paths and patterns chokidar should ignore (including blueprint output). */
export function buildWatchIgnorePatterns(scanRoot: string, outputDir: string): string[] {
  const absoluteOutput = path.resolve(scanRoot, outputDir);
  const relativeOutput = path.relative(scanRoot, absoluteOutput);

  const patterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.turbo/**',
    '**/.next/**',
    '**/coverage/**',
  ];

  if (relativeOutput && !relativeOutput.startsWith('..')) {
    const normalized = relativeOutput.replace(/\\/g, '/');
    patterns.push(`${normalized}/**`, `${normalized}`);
  } else if (path.isAbsolute(absoluteOutput)) {
    patterns.push(absoluteOutput);
  }

  return patterns;
}

export function createDebouncer(run: () => void | Promise<void>, debounceMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void run();
      }, debounceMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}
