import React, { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Filters the forensics ranking list alongside scope/signal controls.
 */
export const ForensicsSearchbar: React.FC<Props> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const kbdText = isMac ? '⌘K' : 'Ctrl+K';

  const expandSearch = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative select-none z-50">
      {!isExpanded ? (
        <button
          type="button"
          aria-label="Expand search"
          onClick={expandSearch}
          className="sm:hidden bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl w-9 h-9 p-0 flex items-center justify-center cursor-pointer"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      ) : null}
      <div
        className={`bg-slate-900 border border-slate-850 hover:border-slate-800 focus-within:border-brand-500 rounded-xl transition-all duration-300 items-center gap-2 ${
          isExpanded
            ? 'flex absolute right-0 top-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-[280px] px-3 py-1.5 sm:relative sm:top-auto sm:translate-y-0 sm:w-64 sm:focus-within:w-80'
            : 'hidden sm:flex w-64 sm:focus-within:w-80 px-3 py-1.5 justify-start'
        }`}
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              onChange('');
              setIsExpanded(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search offenders..."
          aria-label="Search offenders"
          className={`bg-transparent border-none outline-none text-slate-200 text-xs w-full placeholder-slate-500 font-mono ${
            isExpanded ? 'block' : 'hidden sm:block'
          }`}
        />
        {value ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onChange('');
              inputRef.current?.focus();
            }}
            data-testid="forensics-search-clear"
            className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : isExpanded ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="sm:hidden text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[9px] text-slate-300 font-mono shrink-0">
            {kbdText}
          </kbd>
        )}
      </div>
    </div>
  );
};
