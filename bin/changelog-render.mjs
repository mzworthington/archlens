#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const gitCliff = join(root, 'app/node_modules/.bin/git-cliff');

const releases = JSON.parse(
  execFileSync(gitCliff, ['-c', join(root, 'cliff.toml'), '-x'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  }),
);

const GROUP_RANK = new Map([
  ['🚀 Features', 0],
  ['🐛 Bug Fixes', 1],
  ['⚙️ Refactoring & Performance', 2],
  ['🧰 Maintenance & Dependencies', 3],
  ['📚 Documentation', 4],
  ['🧪 Testing', 5],
  ['🎨 Styling', 6],
  ['◀️ Revert', 7],
  ['💼 Other', 8],
]);

const SKIP_MESSAGE = /^(chore\(release\)|chore\(changelog\)):/i;

function stripGroupTags(group) {
  return group.replace(/<!--.*?-->/g, '').trim();
}

function formatBullet(commit) {
  const scope = commit.scope ? `*(${commit.scope})* ` : '';
  const breaking = commit.breaking ? '[**breaking**] ' : '';
  const message = commit.message.charAt(0).toUpperCase() + commit.message.slice(1);
  return `- ${scope}${breaking}${message}`;
}

function shortHash(id) {
  return (id ?? '').slice(0, 7);
}

/** @type {Map<string, { tipTs: number, tipId: string, groups: Map<string, { bullets: string[], messages: Set<string> }> }>} */
const byDay = new Map();

for (const release of releases) {
  for (const commit of release.commits ?? []) {
    const raw = commit.raw_message ?? commit.message ?? '';
    if (SKIP_MESSAGE.test(raw)) continue;

    const date = new Date(commit.author.timestamp * 1000).toISOString().slice(0, 10);
    const group = stripGroupTags(commit.group ?? '💼 Other');
    const bullet = formatBullet(commit);
    const ts = commit.author.timestamp ?? 0;
    const id = commit.id ?? '';

    if (!byDay.has(date)) {
      byDay.set(date, { tipTs: ts, tipId: id, groups: new Map() });
    }

    const day = byDay.get(date);
    if (ts >= day.tipTs) {
      day.tipTs = ts;
      day.tipId = id;
    }

    if (!day.groups.has(group)) day.groups.set(group, { bullets: [], messages: new Set() });

    const bucket = day.groups.get(group);
    if (bucket.messages.has(commit.message)) continue;
    bucket.messages.add(commit.message);
    bucket.bullets.push(bullet);
  }
}

const lines = ['# Changelog', ''];

for (const date of [...byDay.keys()].sort().reverse()) {
  const { tipId, groups } = byDay.get(date);
  lines.push(`## ${shortHash(tipId)} · ${date}`, '');
  const sortedGroups = [...groups.entries()].sort(
    ([a], [b]) => (GROUP_RANK.get(a) ?? 99) - (GROUP_RANK.get(b) ?? 99),
  );

  for (const [group, { bullets }] of sortedGroups) {
    lines.push(`### ${group}`, '');
    lines.push(...bullets, '');
  }
}

writeFileSync(join(root, 'CHANGELOG.md'), `${lines.join('\n').trimEnd()}\n`);
