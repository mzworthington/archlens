import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Filter, X } from 'lucide-react';
import {
  filterTraceLensScopeOptions,
  findTraceLensScopeOption,
  type TraceLensScopeOption,
} from '../../../application/forensics/build/buildTraceLensScopeOptions';

type Props = {
  options: readonly TraceLensScopeOption[];
  value: string | null;
  onChange: (entityRef: string | null) => void;
  disabled?: boolean;
};

function levelLabel(level: TraceLensScopeOption['level']): string {
  switch (level) {
    case 'context':
      return 'Context';
    case 'container':
      return 'Container';
    case 'component':
      return 'Component';
    case 'code':
      return 'Code';
    default:
      return level;
  }
}

export const TraceLensScopePicker: React.FC<Props> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => findTraceLensScopeOption(options, value), [options, value]);

  const filtered = useMemo(() => filterTraceLensScopeOptions(options, query), [options, query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  const openMenu = () => {
    if (disabled) return;
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectOption = (entityRef: string | null) => {
    onChange(entityRef);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, filtered.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex === 0) {
        selectOption(null);
        return;
      }
      const option = filtered[activeIndex - 1];
      if (option) selectOption(option.entityRef);
    }
  };

  const displayLabel =
    selected?.name ?? (value ? (value.split('/').pop() ?? value) : 'All entities');

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 w-full sm:w-72"
      data-testid="tracelens-scope-picker"
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={openMenu}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Filter by entity"
          data-testid="tracelens-scope-picker-trigger"
          className={`min-w-0 flex-1 flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
            disabled
              ? 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
              : value
                ? 'border-[#00f0ff]/25 bg-[#040914]/80 text-white hover:border-[#00f0ff]/40 cursor-pointer'
                : 'border-[#00f0ff]/10 bg-[#040914]/60 text-slate-300 hover:border-[#00f0ff]/25 cursor-pointer'
          }`}
        >
          <Filter className="w-3.5 h-3.5 shrink-0 text-[#00f0ff]/80" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Entity scope
            </span>
            <span className="block truncate text-xs font-semibold">{displayLabel}</span>
          </span>
          {!value ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden />
          ) : null}
        </button>
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => selectOption(null)}
            data-testid="tracelens-scope-picker-clear"
            className="shrink-0 rounded-xl border border-[#00f0ff]/25 bg-[#040914]/80 px-2 text-slate-500 hover:text-slate-300 hover:border-[#00f0ff]/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Clear entity scope"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-xl border border-slate-850 bg-slate-950/95 shadow-2xl backdrop-blur-md overflow-hidden"
          data-testid="tracelens-scope-picker-menu"
        >
          <div className="border-b border-slate-900 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search entities..."
              aria-label="Search entity scope"
              className="w-full rounded-lg border border-slate-850 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-brand-500"
            />
          </div>

          <div
            role="listbox"
            aria-label="Entity scope options"
            className="max-h-64 overflow-y-auto p-1.5"
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => selectOption(null)}
              className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                activeIndex === 0
                  ? 'bg-[#00f0ff]/10 text-white'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
              data-testid="tracelens-scope-option-all"
            >
              <span className="block text-xs font-semibold">All entities</span>
              <span className="block text-[10px] font-mono text-slate-500">No subtree filter</span>
            </button>

            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-[11px] text-slate-500">
                No entities match this search.
              </p>
            ) : (
              filtered.map((option, index) => {
                const listIndex = index + 1;
                const isActive = listIndex === activeIndex;
                return (
                  <button
                    key={option.entityRef}
                    type="button"
                    role="option"
                    aria-selected={value === option.entityRef}
                    onClick={() => selectOption(option.entityRef)}
                    data-testid={`tracelens-scope-option-${option.entityRef}`}
                    className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isActive ? 'bg-[#00f0ff]/10 text-white' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                    style={{ paddingLeft: `${10 + Math.max(0, option.depth - 1) * 10}px` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">{option.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
                        {option.offenderCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        {levelLabel(option.level)}
                      </span>
                      <span className="truncate text-[10px] font-mono text-slate-600">
                        {option.entityRef}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
