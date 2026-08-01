import type {
  OffenderScope,
  OffenderSignalFilter,
  OffenderTestFilter,
} from '../../../application/forensics/rankOffenders';
import type { buildTraceLensScopeOptions } from '../../../application/forensics/buildTraceLensScopeOptions';
import { ForensicsSearchbar } from '../forensics/ForensicsSearchbar';
import { TraceLensScopePicker } from '../forensics/TraceLensScopePicker';
import { TraceLensSegmented } from './TraceLensSegmented';

type ScopeOptions = ReturnType<typeof buildTraceLensScopeOptions>;

export function TraceLensFilters({
  scopeOptions,
  scopeEntityRef,
  onEntityScopeChange,
  hasScope,
  scope,
  onScopeChange,
  filter,
  onFilterChange,
  testFilter,
  onTestFilterChange,
  searchQuery,
  onSearchQueryChange,
  offenderCount,
}: {
  scopeOptions: ScopeOptions;
  scopeEntityRef: string | null;
  onEntityScopeChange: (entityRef: string | null) => void;
  hasScope: boolean;
  scope: OffenderScope;
  onScopeChange: (scope: OffenderScope) => void;
  filter: OffenderSignalFilter;
  onFilterChange: (filter: OffenderSignalFilter) => void;
  testFilter: OffenderTestFilter;
  onTestFilterChange: (testFilter: OffenderTestFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  offenderCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <TraceLensScopePicker
        options={scopeOptions}
        value={scopeEntityRef}
        onChange={onEntityScopeChange}
        disabled={!hasScope || scopeOptions.length === 0}
      />
      <TraceLensSegmented
        value={scope}
        onChange={onScopeChange}
        options={[
          { id: 'components', label: 'Components' },
          { id: 'containers', label: 'Containers' },
        ]}
      />
      <TraceLensSegmented
        value={filter}
        onChange={onFilterChange}
        options={[
          { id: 'all', label: 'All' },
          { id: 'hotspots', label: 'Hotspots' },
          { id: 'heating', label: 'Heating' },
          { id: 'silos', label: 'Silos' },
          { id: 'refactor', label: 'Refactor' },
        ]}
      />
      <TraceLensSegmented
        value={testFilter}
        onChange={onTestFilterChange}
        options={[
          { id: 'all', label: 'All code' },
          { id: 'prod', label: 'Prod' },
          { id: 'test', label: 'Tests' },
        ]}
      />
      <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-3">
        <ForensicsSearchbar value={searchQuery} onChange={onSearchQueryChange} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
          {offenderCount} ranked
        </span>
      </div>
    </div>
  );
}
