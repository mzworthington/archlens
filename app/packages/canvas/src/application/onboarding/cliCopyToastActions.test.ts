import { describe, expect, it, vi } from 'vitest';
import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../constants/cli';
import {
  CLI_COPY_INSTALL_ACTION_LABEL,
  CLI_COPY_SCAN_ACTION_LABEL,
  createCliCopyToastActions,
} from './cliCopyToastActions';

describe('createCliCopyToastActions', () => {
  it('names clipboard actions for install and scan commands', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const actions = createCliCopyToastActions();
    expect(actions.map(action => action.label)).toEqual([
      CLI_COPY_INSTALL_ACTION_LABEL,
      CLI_COPY_SCAN_ACTION_LABEL,
    ]);

    actions[0]!.onClick();
    actions[1]!.onClick();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(CLI_INSTALL_COMMAND);
      expect(writeText).toHaveBeenCalledWith(CLI_SCAN_COMMAND);
    });

    Reflect.deleteProperty(navigator, 'clipboard');
  });
});
