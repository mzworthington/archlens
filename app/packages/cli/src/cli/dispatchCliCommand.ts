import { parseArchlensCommand } from './parseArchlensArgv.ts';
import { executeValidateRun } from './validateRun.ts';
import { executeDiffRun } from './diffRun.ts';
import { executeResilienceRun } from './resilienceRun.ts';
import { executePublishRun } from './publishRun.ts';
import { executeComposeCatalogRun } from './composeCatalogRun.ts';
import { executePublishFragmentRun } from './publishFragmentRun.ts';
import { executePruneCatalogRun } from './pruneCatalogRun.ts';
import { executeAcceptOverlayRun, executeRejectOverlayRun } from './suggestionOverlayRun.ts';

const DISPATCHABLE_PREFIXES = new Set(['validate', 'diff', 'resilience', 'publish', 'catalog']);

/**
 * Run a headless subcommand when argv starts with a known prefix.
 * Returns true when a command was handled.
 */
export async function dispatchCliCommand(args: readonly string[]): Promise<boolean> {
  if (!args[0] || !DISPATCHABLE_PREFIXES.has(args[0])) return false;

  const command = parseArchlensCommand([...args]);
  switch (command.kind) {
    case 'validate':
      await executeValidateRun(command.plan);
      return true;
    case 'diff':
      await executeDiffRun(command.plan);
      return true;
    case 'resilience':
      await executeResilienceRun(command.plan);
      return true;
    case 'publish':
      await executePublishRun(command.plan);
      return true;
    case 'catalog-compose':
      await executeComposeCatalogRun(command.plan);
      return true;
    case 'catalog-publish-fragment':
      await executePublishFragmentRun(command.plan);
      return true;
    case 'catalog-accept-overlay':
      await executeAcceptOverlayRun(command.plan);
      return true;
    case 'catalog-reject-overlay':
      await executeRejectOverlayRun(command.plan);
      return true;
    case 'catalog-prune':
      await executePruneCatalogRun(command.plan);
      return true;
    default:
      return false;
  }
}
