import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  CANCEL_LABEL,
  GENERATE_OFF_MESSAGE,
  GENERATE_TITLE,
  INTEREST_DISCUSSION_URL,
  TELL_US_LABEL,
  UNTRUSTED_FOLDER_MESSAGE,
} from '../../copy';
import {
  httpsDiscussionUrl,
  planGenerateFromWorkspace,
  type GenerateHost,
  type InterestPrompt,
} from './planGenerate';
import { contributedCommands } from './contributedCommands';

function host(overrides: Partial<GenerateHost> = {}): GenerateHost {
  return {
    isTrusted: () => true,
    isGenerateEnabled: () => false,
    discussionUrl: () => INTEREST_DISCUSSION_URL,
    askInterest: async () => 'cancel',
    openDiscussion: async () => undefined,
    ...overrides,
  };
}

describe('planGenerateFromWorkspace', () => {
  it('does not read a blueprint when the workspace is untrusted', async () => {
    const askInterest = vi.fn<GenerateHost['askInterest']>(async () => 'tell-us');
    const openDiscussion = vi.fn<GenerateHost['openDiscussion']>(async () => undefined);
    const result = await planGenerateFromWorkspace(
      host({ isTrusted: () => false, askInterest, openDiscussion })
    );
    expect(result).toEqual({
      kind: 'blocked',
      message: UNTRUSTED_FOLDER_MESSAGE,
      scansWorkspace: false,
      writesBlueprint: false,
      opensDiscussion: false,
    });
    expect(askInterest).not.toHaveBeenCalled();
    expect(openDiscussion).not.toHaveBeenCalled();
  });

  it('shows the interest prompt and opens the discussion when generation is off', async () => {
    const openDiscussion = vi.fn<GenerateHost['openDiscussion']>(async () => undefined);
    const result = await planGenerateFromWorkspace(
      host({
        openDiscussion,
        askInterest: async (prompt: InterestPrompt) => {
          expect(prompt).toEqual({
            title: GENERATE_TITLE,
            body: GENERATE_OFF_MESSAGE,
            tellUs: TELL_US_LABEL,
            cancel: CANCEL_LABEL,
          });
          return 'tell-us';
        },
      })
    );
    expect(result).toMatchObject({
      kind: 'interest',
      generateEnabled: false,
      opensDiscussion: true,
      discussionUrl: INTEREST_DISCUSSION_URL,
      scansWorkspace: false,
      writesBlueprint: false,
    });
    expect(openDiscussion).toHaveBeenCalledWith(INTEREST_DISCUSSION_URL);
  });

  it('closes on Escape and writes nothing', async () => {
    const openDiscussion = vi.fn<GenerateHost['openDiscussion']>(async () => undefined);
    const result = await planGenerateFromWorkspace(
      host({ askInterest: async () => 'escape', openDiscussion })
    );
    expect(result).toMatchObject({
      kind: 'dismissed',
      choice: 'escape',
      scansWorkspace: false,
      writesBlueprint: false,
      opensDiscussion: false,
    });
    expect(openDiscussion).not.toHaveBeenCalled();
  });

  it('closes on Cancel and writes nothing', async () => {
    const openDiscussion = vi.fn<GenerateHost['openDiscussion']>(async () => undefined);
    const result = await planGenerateFromWorkspace(
      host({ askInterest: async () => 'cancel', openDiscussion })
    );
    expect(result).toMatchObject({ kind: 'dismissed', choice: 'cancel', writesBlueprint: false });
    expect(openDiscussion).not.toHaveBeenCalled();
  });

  it('does not scan or write when generate-from-workspace is enabled before the scan story', async () => {
    const generate = host({
      isGenerateEnabled: () => true,
      askInterest: vi.fn(async (prompt: InterestPrompt) => {
        expect(prompt.body).toBe(GENERATE_OFF_MESSAGE);
        return 'cancel' as const;
      }),
    });
    const result = await planGenerateFromWorkspace(generate);
    expect(result).toMatchObject({
      generateEnabled: true,
      scansWorkspace: false,
      writesBlueprint: false,
      opensDiscussion: false,
    });
  });

  it('does not open a discussion url that is not https', async () => {
    const openDiscussion = vi.fn<GenerateHost['openDiscussion']>(async () => undefined);
    const result = await planGenerateFromWorkspace(
      host({
        discussionUrl: () => 'javascript:alert(1)',
        askInterest: async () => 'tell-us',
        openDiscussion,
      })
    );
    expect(result).toMatchObject({ opensDiscussion: false, writesBlueprint: false });
    expect(openDiscussion).not.toHaveBeenCalled();
    expect(httpsDiscussionUrl('http://example.com')).toBeUndefined();
    expect(httpsDiscussionUrl(INTEREST_DISCUSSION_URL)).toBe(INTEREST_DISCUSSION_URL);
  });
});

describe('contributedCommands', () => {
  it('ships open map and generate in the pre-release manifest', () => {
    const manifest = JSON.parse(
      fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
    ) as {
      preview: boolean;
      version: string;
      contributes: {
        commands: unknown;
        menus: { 'explorer/context': { command: string }[] };
        configuration: { properties: Record<string, { default: unknown }> };
      };
      capabilities: { untrustedWorkspaces: { supported: string } };
    };
    expect(manifest.preview).toBe(true);
    expect(manifest.version).toContain('-preview');
    expect(manifest.contributes.commands).toEqual(contributedCommands({ generateRemoved: false }));
    expect(
      manifest.contributes.configuration.properties['archlens.generateFromWorkspace.enabled']
        ?.default
    ).toBe(false);
    expect(manifest.contributes.menus['explorer/context'].map(item => item.command)).toEqual([
      'archlens.openArchitectureMap',
      'archlens.generateDiagramFromWorkspace',
    ]);
    expect(manifest.capabilities.untrustedWorkspaces.supported).toBe('limited');
  });

  it('keeps the preview and removes generate when the bet is killed', () => {
    expect(contributedCommands({ generateRemoved: true })).toEqual([
      {
        command: 'archlens.openArchitectureMap',
        title: 'Open architecture map',
        category: 'ArchLens',
      },
    ]);
  });
});
