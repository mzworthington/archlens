import * as p from '@clack/prompts';
import { checkForUpdate, shouldCheckForUpdates } from './updateCheck.ts';
import { getArchlensVersion, isCompiledRelease } from './version.ts';
import { isHeadlessArgv, isUpdateSubcommand, skipUpdateCheck } from './parseArchlensArgv.ts';
import { performSelfUpdate } from './selfUpdate.ts';

export async function runUpdateCommand(currentVersion = getArchlensVersion()): Promise<void> {
  if (!isCompiledRelease()) {
    console.error('Updates are only available for installed release binaries.');
    process.exit(1);
  }

  try {
    const availability = await checkForUpdate(currentVersion);
    if (!availability) {
      console.log(`archlens ${currentVersion} is already up to date.`);
      process.exit(0);
    }

    console.log(`Updating archlens ${availability.current} → ${availability.latest}…`);
    await performSelfUpdate(availability.latest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Update failed: ${message}`);
    process.exit(1);
  }
}

export async function maybePromptAndSelfUpdate(argv: string[]): Promise<void> {
  const shouldCheck = shouldCheckForUpdates({
    argv,
    isCompiledRelease: isCompiledRelease(),
    isHeadless: isHeadlessArgv(argv),
    isInteractiveTty: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    isCi: Boolean(process.env.CI),
    skipUpdateCheckFlag: skipUpdateCheck(argv),
    isUpdateSubcommand: isUpdateSubcommand(argv),
  });

  if (!shouldCheck) return;

  try {
    const availability = await checkForUpdate(getArchlensVersion());
    if (!availability) return;

    const accepted = await p.confirm({
      message: `ArchLens ${availability.latest} is available (you have ${availability.current}). Update now?`,
      initialValue: true,
    });

    if (p.isCancel(accepted) || !accepted) {
      return;
    }

    await performSelfUpdate(availability.latest);
  } catch {
    // Do not block interactive analysis when update checks fail.
  }
}
