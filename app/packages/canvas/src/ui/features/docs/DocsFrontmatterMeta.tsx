import type { DocsFrontmatter } from './presentDocsMarkdown';

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  date: 'Date',
  deciders: 'Deciders',
};

type Props = {
  fields: DocsFrontmatter;
};

/** Quiet meta strip for ADR YAML frontmatter (ArchLens docs chrome). */
export function DocsFrontmatterMeta({ fields }: Props) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return null;

  return (
    <dl
      className="mb-8 flex flex-wrap gap-x-8 gap-y-3 border-b border-white/10 pb-5"
      data-testid="docs-frontmatter"
    >
      {entries.map(([key, value]) => (
        <div key={key} className="flex min-w-[7rem] flex-col gap-0.5">
          <dt className="text-[0.7rem] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            {FIELD_LABELS[key] ?? key}
          </dt>
          <dd className="m-0 text-[0.95rem] leading-snug text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
