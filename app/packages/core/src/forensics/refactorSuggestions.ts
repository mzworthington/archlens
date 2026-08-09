import type { NodeForensics } from '../models/schema';
import type { OwnershipBreakdown } from './ownership';
import type { RefactorBoundary, RefactorBoundarySignal } from './refactorBoundary';

export type RefactorSuggestionKind =
  | 'extract-shared-logic'
  | 'split-by-container'
  | 'define-api-boundary'
  | 'add-second-owner'
  | 'coordinate-ownership';

export type RefactorSuggestionSection = 'coupled-files' | 'ownership' | 'boundary-members';

export interface RefactorSuggestion {
  kind: RefactorSuggestionKind;
  title: string;
  detail: string;
  relatedSections: RefactorSuggestionSection[];
  priority: number;
}

export interface BuildRefactorSuggestionsOptions {
  ownership?: OwnershipBreakdown;
  seedForensics?: NodeForensics;
}

function hasSignal(
  signals: readonly RefactorBoundarySignal[],
  signal: RefactorBoundarySignal
): boolean {
  return signals.includes(signal);
}

function pushSuggestion(list: RefactorSuggestion[], suggestion: RefactorSuggestion): void {
  if (list.some(s => s.kind === suggestion.kind)) return;
  list.push(suggestion);
}

/**
 * Derive actionable refactor suggestions from a boundary cluster and ownership context.
 * Display-only guidance - never written to schema YAML.
 */
export function buildRefactorSuggestions(
  boundary: RefactorBoundary,
  options: BuildRefactorSuggestionsOptions = {}
): RefactorSuggestion[] {
  const { ownership, seedForensics } = options;
  const suggestions: RefactorSuggestion[] = [];
  const { signals, members, spansContainers } = boundary;
  const coupledCount = seedForensics?.coupledFiles?.length ?? 0;

  if (hasSignal(signals, 'high-coupling') && members.length >= 2) {
    pushSuggestion(suggestions, {
      kind: 'extract-shared-logic',
      title: 'Extract shared logic',
      detail:
        coupledCount > 0
          ? `${members.length} files change together across ${coupledCount} coupled peer${coupledCount === 1 ? '' : 's'} - pull shared code into a module both sides depend on.`
          : `${members.length} files change together - pull shared code into a module both sides depend on.`,
      relatedSections: ['coupled-files', 'boundary-members'],
      priority: 90,
    });
  }

  if (spansContainers || hasSignal(signals, 'cross-container')) {
    pushSuggestion(suggestions, {
      kind: 'split-by-container',
      title: 'Split by container boundary',
      detail:
        'Coupled files span multiple containers - carve ownership along container lines before extracting shared code.',
      relatedSections: ['boundary-members'],
      priority: 85,
    });
    pushSuggestion(suggestions, {
      kind: 'define-api-boundary',
      title: 'Define an API boundary',
      detail:
        'Introduce a stable contract between containers so refactors do not leak across deployment units.',
      relatedSections: ['boundary-members', 'coupled-files'],
      priority: 80,
    });
  }

  const soloOwnership =
    ownership?.concentration === 'solo' ||
    hasSignal(signals, 'knowledge-silo') ||
    (seedForensics?.authorCount === 1 && (seedForensics.complexity ?? 0) >= 10);

  if (soloOwnership) {
    pushSuggestion(suggestions, {
      kind: 'add-second-owner',
      title: 'Add a second owner',
      detail:
        'Complex code with concentrated authorship - pair on changes or rotate reviews to reduce bus factor.',
      relatedSections: ['ownership'],
      priority: 75,
    });
  }

  if (hasSignal(signals, 'distributed-ownership')) {
    pushSuggestion(suggestions, {
      kind: 'coordinate-ownership',
      title: 'Coordinate before splitting',
      detail:
        'Multiple authors touch these files - agree on extraction boundaries and review order before refactoring.',
      relatedSections: ['ownership', 'boundary-members'],
      priority: 70,
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}
