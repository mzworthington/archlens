import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'lighthouse-report', 'manifest.json');
const assertionsPath = path.join(root, '.lighthouseci', 'assertion-results.json');

function formatPage(url) {
  try {
    const pathname = new URL(url).pathname;
    return pathname === '/' ? '/' : pathname;
  } catch {
    return url;
  }
}

function formatScore(score) {
  return score == null ? '—' : String(Math.round(score * 100));
}

function buildSummary() {
  if (!fs.existsSync(manifestPath)) {
    return '## Lighthouse\n\n_No report manifest found. The Lighthouse step may have failed before reports were written._\n';
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const assertions = fs.existsSync(assertionsPath)
    ? JSON.parse(fs.readFileSync(assertionsPath, 'utf8'))
    : [];

  const failures = assertions.filter((assertion) => !assertion.passed);

  let markdown = '## Lighthouse scores\n\n';
  markdown +=
    '| Page | Performance | Accessibility | Best practices | SEO |\n| --- | ---: | ---: | ---: | ---: |\n';

  for (const entry of manifest) {
    const { summary } = entry;
    markdown += `| \`${formatPage(entry.url)}\` | ${formatScore(summary.performance)} | ${formatScore(summary.accessibility)} | ${formatScore(summary['best-practices'])} | ${formatScore(summary.seo)} |\n`;
  }

  if (failures.length > 0) {
    markdown += '\n### Assertion failures\n\n';
    for (const assertion of failures) {
      const icon = assertion.level === 'error' ? '❌' : '⚠️';
      const actual = assertion.actual == null ? '—' : String(Math.round(assertion.actual * 100));
      const expected = Math.round(assertion.expected * 100);
      markdown += `- ${icon} **\`${formatPage(assertion.url)}\`** — ${assertion.auditProperty}: expected ≥ ${expected}, got ${actual}\n`;
    }
  } else if (assertions.length > 0) {
    markdown += '\nAll configured assertions passed.\n';
  }

  markdown += '\n_Download the **lighthouse-report** artifact for full HTML reports._\n';
  return markdown;
}

const summary = buildSummary();
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

if (summaryFile) {
  fs.appendFileSync(summaryFile, summary);
} else {
  process.stdout.write(summary);
}
