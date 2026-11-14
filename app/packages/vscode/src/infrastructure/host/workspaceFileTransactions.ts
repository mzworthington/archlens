import path from 'node:path';
import {
  CANCEL_COPY,
  CUSTOM_FILES_COPY,
  CUSTOM_GLOB_HINT,
  DEFAULT_SOURCE_GLOB,
  GENERATE_DIAGRAM_COPY,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  KEEP_FILES_COPY,
  REVIEW_NOTE,
  REVIEW_TITLE,
  TELL_US_COPY,
  THIS_FOLDER_COPY,
  WHOLE_WORKSPACE_COPY,
  WRITE_BLUEPRINT_COPY,
  reviewSummary,
  type ReviewRow,
} from '../../features/editorPreview/domain';
import type {
  GenerateChoice,
  ReviewChoice,
  ScanOutcome,
  ScanScopeChoice,
} from '../../features/editorPreview/ports';
import type { VsCodeLike } from '../vscodeHost';
import type { FileUri } from './vscodeTypes';

export async function hasGitHistory<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string
): Promise<boolean> {
  const folder = root.replaceAll('\\', '/').replace(/\/+$/, '');
  try {
    await api.workspace.fs.stat(api.Uri.file(`${folder}/.git`));
    return true;
  } catch {
    return false;
  }
}

export async function readGitignore<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string
): Promise<string> {
  try {
    const bytes = await api.workspace.fs.readFile(api.Uri.file(path.join(root, '.gitignore')));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

export async function listSourceFiles<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string,
  glob: string
): Promise<string[]> {
  const patterns =
    glob === DEFAULT_SOURCE_GLOB ? [glob, '**/*.tf.json', '**/Pulumi*.{yaml,yml}'] : [glob];
  const paths: string[] = [];
  for (const pattern of patterns) {
    const uris = await api.workspace.findFiles({ base: root, pattern });
    for (const uri of uris) paths.push(uri.fsPath);
  }
  return [...new Set(paths)];
}

export async function askScanScope<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  found: string
): Promise<ScanScopeChoice> {
  const picked = await api.window.showQuickPick(
    [
      { label: WHOLE_WORKSPACE_COPY, description: found, path: 'workspace' },
      { label: THIS_FOLDER_COPY, description: found, path: 'folder' },
      { label: CUSTOM_FILES_COPY, description: found, path: 'custom' },
    ],
    { title: GENERATE_TITLE, placeHolder: found }
  );
  if (picked?.path === 'workspace' || picked?.path === 'folder' || picked?.path === 'custom') {
    return picked.path;
  }
  return 'escape';
}

export async function askScanGlob<Uri extends FileUri>(
  api: VsCodeLike<Uri>
): Promise<string | undefined> {
  const glob = await api.window.showInputBox({
    title: CUSTOM_FILES_COPY,
    prompt: CUSTOM_GLOB_HINT,
    value: DEFAULT_SOURCE_GLOB,
  });
  const trimmed = glob?.trim();
  return trimmed ? trimmed : undefined;
}

export async function confirmGenerate<Uri extends FileUri>(
  api: VsCodeLike<Uri>
): Promise<'generate' | 'cancel'> {
  const choice = await api.window.showInformationMessage(
    GENERATE_DIAGRAM_COPY,
    { modal: true },
    GENERATE_DIAGRAM_COPY,
    CANCEL_COPY
  );
  return choice === GENERATE_DIAGRAM_COPY ? 'generate' : 'cancel';
}

export async function scanFolder<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string
): Promise<ScanOutcome> {
  try {
    return await api.window.withProgress(
      { title: `Scanning ${root}…`, cancellable: true },
      async token => (token.isCancellationRequested ? 'cancelled' : 'ready')
    );
  } catch {
    return 'failed';
  }
}

export async function showReview<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  rows: readonly ReviewRow[]
): Promise<ReviewChoice> {
  const lines = reviewSummary(rows);
  const choice = await api.window.showInformationMessage(
    REVIEW_TITLE,
    { modal: true, detail: `${lines}\n\n${REVIEW_NOTE}` },
    KEEP_FILES_COPY,
    ...(rows.length > 0 ? [WRITE_BLUEPRINT_COPY] : [])
  );
  if (choice === WRITE_BLUEPRINT_COPY) return 'write';
  if (choice === KEEP_FILES_COPY) return 'keep';
  return 'escape';
}

export async function askGenerateInterest<Uri extends FileUri>(
  api: VsCodeLike<Uri>
): Promise<GenerateChoice> {
  const choice = await api.window.showInformationMessage(
    GENERATE_TITLE,
    { modal: true, detail: GENERATE_OFF_COPY },
    TELL_US_COPY,
    CANCEL_COPY
  );
  if (choice === TELL_US_COPY) return 'tell';
  if (choice === CANCEL_COPY) return 'cancel';
  return 'escape';
}
