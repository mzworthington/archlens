import React, { useCallback, useState } from 'react';
import { Download, Layers } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

type BlankCanvasFileSaveProps = {
  compact?: boolean;
  onSaved?: () => void;
};

export const BlankCanvasFileSave: React.FC<BlankCanvasFileSaveProps> = ({
  compact = false,
  onSaved,
}) => {
  const schemaName = useBlueprintStore(s => s.schema.name);
  const isLoading = useBlueprintStore(s => s.isLoading);
  const updateSchemaName = useBlueprintStore(s => s.updateSchemaName);
  const saveSchema = useBlueprintStore(s => s.saveSchema);
  const [name, setName] = useState(schemaName);
  const disabled = Boolean(isLoading);

  const handleSave = useCallback(async () => {
    const next = name.trim() || schemaName;
    if (next !== schemaName) {
      updateSchemaName(next);
    }
    const saved = await saveSchema();
    if (saved) onSaved?.();
  }, [name, onSaved, saveSchema, schemaName, updateSchemaName]);

  return (
    <form
      className={
        compact
          ? 'flex min-w-0 flex-1 items-center gap-2 px-2 py-1'
          : 'flex items-center gap-1.5 min-w-0'
      }
      onSubmit={event => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <Layers className="w-3.5 h-3.5 shrink-0 text-blue-400" aria-hidden />
      <input
        type="text"
        value={name}
        onChange={event => setName(event.target.value)}
        disabled={disabled}
        aria-label="Diagram file name"
        placeholder="Name this diagram"
        className="min-w-0 w-[10rem] sm:w-[14rem] rounded-md border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:border-brand-500/40 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label="Save YAML"
        title="Save YAML and reopen the file"
        className="min-h-8 min-w-8 sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center rounded-md border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:text-slate-100 hover:border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    </form>
  );
};
