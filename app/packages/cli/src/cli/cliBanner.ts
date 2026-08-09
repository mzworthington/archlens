import pc from 'picocolors';
import { getArchlensVersion } from './version.ts';

const BANNER_INNER_WIDTH = 52;

function padLine(content: string, width = BANNER_INNER_WIDTH): string {
  const visible = stripAnsi(content);
  const padding = Math.max(0, width - visible.length);
  return `${content}${' '.repeat(padding)}`;
}

const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, '');
}

function borderLine(content = ''): string {
  return `${pc.cyan('  │')} ${padLine(content)} ${pc.cyan('│')}`;
}

function topBorder(): string {
  return pc.cyan(`  ╭${'─'.repeat(BANNER_INNER_WIDTH + 2)}╮`);
}

function bottomBorder(): string {
  return pc.cyan(`  ╰${'─'.repeat(BANNER_INNER_WIDTH + 2)}╯`);
}

function titleLine(): string {
  const title =
    pc.bold(pc.cyan('◆')) +
    pc.bold('  ') +
    pc.bold(pc.cyan('ARCH')) +
    pc.bold(pc.white('LENS')) +
    pc.bold(pc.dim('  CLI'));
  return borderLine(title);
}

function taglineLine(text: string): string {
  return borderLine(pc.dim(text));
}

function versionLine(version: string): string {
  const label = version === 'dev' ? pc.dim('development build') : pc.dim(version);
  const visible = stripAnsi(label);
  const padding = Math.max(0, BANNER_INNER_WIDTH - visible.length);
  return borderLine(`${' '.repeat(padding)}${label}`);
}

/** Branded lead-in shown before interactive prompts. */
export function renderCliBanner(version = getArchlensVersion()): void {
  console.log('');
  console.log(topBorder());
  console.log(borderLine());
  console.log(titleLine());
  console.log(borderLine());
  console.log(taglineLine('Map your codebase to C4 architecture blueprints'));
  console.log(taglineLine('Context · Containers · Components · TraceLens'));
  console.log(borderLine());
  console.log(versionLine(version));
  console.log(borderLine());
  console.log(bottomBorder());
  console.log('');
}

export function renderCliIntroNote(configPath?: string): void {
  if (configPath) {
    console.log(`${pc.cyan('  ◇')}  ${pc.dim('Config')}  ${pc.white(configPath)}`);
    console.log('');
  }
}

/** Short hints shown under the banner in interactive mode. */
export function renderCliQuickTips(): void {
  console.log(
    `${pc.cyan('  ◇')}  ${pc.dim('Tips:')} ${pc.white('Tab')} ${pc.dim('complete paths ·')} ${pc.white('Ctrl+C')} ${pc.dim('cancel ·')} ${pc.white('archlens help')} ${pc.dim('all commands')}`
  );
  console.log('');
}

export function formatSuccessOutro(outputDir: string): string {
  return pc.green(`Blueprints ready at ${pc.bold(outputDir)}`);
}

export function formatAnalysisSpinnerMessage(withForensics: boolean): string {
  return withForensics
    ? 'Scanning source and Git history…'
    : 'Scanning source and building diagrams…';
}
