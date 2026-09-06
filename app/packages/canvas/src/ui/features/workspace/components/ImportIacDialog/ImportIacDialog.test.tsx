import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ImportIacDialog } from './ImportIacDialog';
import { useBlueprintStore } from '../../../../../application/store/store';
import { createBrowserLayoutRegistry } from '../../../../../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../../../../../infrastructure/layout/reactFlowGraphChangeAdapter';
import {
  IAC_IMPORT_FILTER_NOTE,
  IAC_IMPORT_MERGE_FOOTER,
} from '../../../../../application/store/states/diagramState/import/importIac';

const AWS_PACK = `
resource "aws_lambda_function" "api" {
  function_name = "api"
}

resource "aws_iam_role" "lambda" {
  name = "lambda"
}
`;

describe('ImportIacDialog', () => {
  beforeEach(() => {
    useBlueprintStore.getState().setPorts({
      layoutRegistry: createBrowserLayoutRegistry(),
      graphChangePort: reactFlowGraphChangeAdapter,
    });
    useBlueprintStore.getState().resetToEmptyWorkspace();
  });

  it('shows the same significance filter the preview applies', async () => {
    render(<ImportIacDialog isOpen onClose={() => undefined} />);

    const dialog = screen.getByRole('dialog', { name: /import infrastructure/i });
    expect(dialog).toHaveAttribute('aria-describedby', 'iac-import-filter-note');
    expect(screen.getByText(new RegExp(IAC_IMPORT_FILTER_NOTE, 'i'))).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Paste Terraform/i), {
      target: { value: AWS_PACK },
    });

    await waitFor(() => {
      expect(screen.getByText(/1 meaningful external \(lambda\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText(IAC_IMPORT_MERGE_FOOTER)).toBeInTheDocument();
    expect(screen.getByText(/supporting/i)).toBeInTheDocument();
  });
});
