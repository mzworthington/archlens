import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import { executePublishRun } from './publishRun.ts';
import { executeComposeCatalogRun } from './composeCatalogRun.ts';
import { executePublishFragmentRun } from './publishFragmentRun.ts';
import { executeAcceptOverlayRun, executeRejectOverlayRun } from './suggestionOverlayRun.ts';
import {
  promptInteractiveAcceptOverlayPlan,
  promptInteractiveComposePlan,
  promptInteractiveMainAction,
  promptInteractivePublishFragmentPlan,
  promptInteractivePublishPlan,
  promptInteractiveRejectOverlayPlan,
} from './interactiveMainMenu.ts';

type AskPath = (message: string, defaultValue: string) => Promise<string>;

/**
 * Prompt for and execute an interactive main-menu action.
 * Returns true when the caller should skip the default architecture scan.
 */
export async function runInteractiveMainMenu(
  plan: ArchlensCliPlan,
  askPath: AskPath,
  runArchitecture: (plan: ArchlensCliPlan) => Promise<void>
): Promise<boolean> {
  const action = await promptInteractiveMainAction();
  switch (action) {
    case 'scan':
      await runArchitecture(plan);
      return true;
    case 'publish':
      await executePublishRun(await promptInteractivePublishPlan(askPath));
      return true;
    case 'publish-fragment':
      await executePublishFragmentRun(await promptInteractivePublishFragmentPlan(askPath));
      return true;
    case 'compose':
      await executeComposeCatalogRun(await promptInteractiveComposePlan());
      return true;
    case 'accept-overlay':
      await executeAcceptOverlayRun(await promptInteractiveAcceptOverlayPlan(askPath));
      return true;
    case 'reject-overlay':
      await executeRejectOverlayRun(await promptInteractiveRejectOverlayPlan());
      return true;
    default:
      return false;
  }
}
