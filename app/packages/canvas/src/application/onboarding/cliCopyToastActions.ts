import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../constants/cli';
import type { ToastAction } from '../store/states/uiState';

export const CLI_COPY_INSTALL_ACTION_LABEL = 'Copy install command';
export const CLI_COPY_SCAN_ACTION_LABEL = 'Copy scan command';

async function copyCommand(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    // Clipboard may be unavailable in some contexts
  }
}

export function createCliCopyToastActions(): ToastAction[] {
  return [
    {
      label: CLI_COPY_INSTALL_ACTION_LABEL,
      onClick: () => {
        void copyCommand(CLI_INSTALL_COMMAND);
      },
    },
    {
      label: CLI_COPY_SCAN_ACTION_LABEL,
      onClick: () => {
        void copyCommand(CLI_SCAN_COMMAND);
      },
    },
  ];
}
