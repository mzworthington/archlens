import {
  CANCEL_LABEL,
  GENERATE_OFF_MESSAGE,
  GENERATE_TITLE,
  TELL_US_LABEL,
  UNTRUSTED_FOLDER_MESSAGE,
} from '../../copy';

export interface InterestPrompt {
  title: string;
  body: string;
  tellUs: string;
  cancel: string;
}

export type InterestChoice = 'tell-us' | 'cancel' | 'escape';

export interface GenerateHost {
  isTrusted(): boolean;
  isGenerateEnabled(): boolean;
  discussionUrl(): string;
  askInterest(prompt: InterestPrompt): Promise<InterestChoice>;
  openDiscussion(url: string): Promise<void>;
}

const noWrite = { scansWorkspace: false as const, writesBlueprint: false as const };

export type GenerateResult =
  | ({
      kind: 'blocked';
      message: typeof UNTRUSTED_FOLDER_MESSAGE;
      opensDiscussion: false;
    } & typeof noWrite)
  | ({
      kind: 'interest';
      choice: 'tell-us';
      generateEnabled: boolean;
      discussionUrl?: string;
      opensDiscussion: boolean;
    } & typeof noWrite)
  | ({
      kind: 'dismissed';
      choice: 'cancel' | 'escape';
      generateEnabled: boolean;
      opensDiscussion: false;
    } & typeof noWrite);

export function httpsDiscussionUrl(value: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error: unknown) {
    if (error instanceof Error) return undefined;
    return undefined;
  }
  if (url.protocol !== 'https:') return undefined;
  return url.toString();
}

export async function planGenerateFromWorkspace(host: GenerateHost): Promise<GenerateResult> {
  if (!host.isTrusted()) {
    return {
      kind: 'blocked',
      message: UNTRUSTED_FOLDER_MESSAGE,
      opensDiscussion: false,
      ...noWrite,
    };
  }
  const generateEnabled = host.isGenerateEnabled();
  const choice = await host.askInterest({
    title: GENERATE_TITLE,
    body: GENERATE_OFF_MESSAGE,
    tellUs: TELL_US_LABEL,
    cancel: CANCEL_LABEL,
  });
  if (choice === 'cancel' || choice === 'escape') {
    return { kind: 'dismissed', choice, generateEnabled, opensDiscussion: false, ...noWrite };
  }
  const url = httpsDiscussionUrl(host.discussionUrl());
  if (!url) {
    return {
      kind: 'interest',
      choice,
      generateEnabled,
      opensDiscussion: false,
      ...noWrite,
    };
  }
  await host.openDiscussion(url);
  return {
    kind: 'interest',
    choice,
    generateEnabled,
    discussionUrl: url,
    opensDiscussion: true,
    ...noWrite,
  };
}
