import * as p from '@clack/prompts';
import pc from 'picocolors';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

function completePath(line: string): [string[], string] {
  const lineNormalized = line.replace(/\\/g, '/');
  const lastSlashIdx = lineNormalized.lastIndexOf('/');
  const dirPath = lastSlashIdx !== -1 ? lineNormalized.substring(0, lastSlashIdx) : '.';
  const filePrefix =
    lastSlashIdx !== -1 ? lineNormalized.substring(lastSlashIdx + 1) : lineNormalized;

  try {
    const targetDir = path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
      return [[], line];
    }

    const entries = fs.readdirSync(targetDir);
    const hits = entries
      .filter(entry => entry.startsWith(filePrefix))
      .map(entry => {
        const relative = lastSlashIdx !== -1 ? `${dirPath}/${entry}` : entry;
        const fullPath = path.resolve(targetDir, entry);
        return fs.statSync(fullPath).isDirectory() ? `${relative}/` : relative;
      });

    return [hits, line];
  } catch {
    return [[], line];
  }
}

export function askPathWithTabComplete(message: string, defaultValue: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: completePath,
    });

    rl.on('SIGINT', () => {
      rl.close();
      console.log();
      p.cancel('Analysis cancelled.');
      process.exit(0);
    });

    const promptText = `${pc.cyan('◇')}  ${message}\n${pc.cyan('│')}  ${pc.dim('Default:')} ${pc.yellow(defaultValue)} ${pc.dim('(Press Tab to autocomplete)')}\n${pc.cyan('└')}  `;
    rl.question(promptText, answer => {
      rl.close();
      const finalVal = answer.trim() || defaultValue;
      console.log(`${pc.cyan('│')}  ${pc.green(finalVal)}`);
      resolve(finalVal);
    });
  });
}
