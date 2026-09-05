import pc from 'picocolors';
import type { BlueprintTreeDiff } from '@archlens/core';
import { blueprintTreeDiffHasChanges } from '@archlens/core';
import type { OutputFormat } from './formatValidationResult.ts';

export function formatBlueprintTreeDiff(treeDiff: BlueprintTreeDiff, format: OutputFormat): string {
  if (format === 'json') {
    return `${JSON.stringify(treeDiff, null, 2)}\n`;
  }

  if (!blueprintTreeDiffHasChanges(treeDiff)) {
    return pc.green('✔ No structural differences between blueprint trees.\n');
  }

  const lines = [pc.yellow('△ Blueprint tree differences:\n')];
  for (const file of treeDiff.files) {
    if (file.status === 'unchanged') continue;
    lines.push(`  ${pc.bold(file.relativePath)} ${pc.dim(`(${file.status})`)}`);
    if (!file.diff) continue;

    for (const node of file.diff.nodes.added) {
      lines.push(`    ${pc.green('+')} node ${node.entityRef} (${node.name})`);
    }
    for (const node of file.diff.nodes.deleted) {
      lines.push(`    ${pc.red('-')} node ${node.entityRef} (${node.name})`);
    }
    for (const { original, current } of file.diff.nodes.modified) {
      lines.push(`    ${pc.yellow('~')} node ${current.entityRef}`);
      if (original.name !== current.name) {
        lines.push(`      name: ${original.name} -> ${current.name}`);
      }
      if (original.type !== current.type) {
        lines.push(`      type: ${original.type} -> ${current.type}`);
      }
    }
    for (const dep of file.diff.dependencies.added) {
      lines.push(`    ${pc.green('+')} dep ${dep.fromRef} -> ${dep.toRef} (${dep.type})`);
    }
    for (const dep of file.diff.dependencies.deleted) {
      lines.push(`    ${pc.red('-')} dep ${dep.fromRef} -> ${dep.toRef} (${dep.type})`);
    }
  }

  return `${lines.join('\n')}\n`;
}
