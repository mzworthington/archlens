import { useMemo, useState } from 'react';
import todayMd from '@docs/today-jobs.md?raw';
import { presentInlineMarkdown } from './presentInlineMarkdown';
import {
  isTodayJobPath,
  parseTodayJobsMarkdown,
  resolveTodayJobHref,
  type TodayJob,
} from './parseTodayJobs';

export function TodayJobs({ showHeading = false }: { showHeading?: boolean }) {
  const jobs = useMemo(() => parseTodayJobsMarkdown(todayMd), []);
  const [activeId, setActiveId] = useState(jobs[0]?.id ?? '');
  const active = jobs.find(job => job.id === activeId);
  const [copied, setCopied] = useState(false);

  if (jobs.length === 0) return null;

  return (
    <section
      id="today"
      data-testid="today-jobs"
      aria-labelledby={showHeading ? 'today-heading' : undefined}
      aria-label={showHeading ? undefined : 'Jobs you can do today'}
    >
      {showHeading ? (
        <div>
          <h2
            id="today-heading"
            className="text-xs font-mono uppercase tracking-[0.16em] text-slate-200 mb-2"
          >
            What do I do today?
          </h2>
          <p className="mb-5 max-w-xl text-sm text-slate-100 leading-relaxed">
            Pick the job in front of you. Each card opens the steps and a command or path you can
            use now.
          </p>
        </div>
      ) : null}
      <div role="group" aria-label="Job list">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => {
            const selected = job.id === active?.id;
            return (
              <li key={job.id} className="contents">
                <button
                  type="button"
                  className={`flex h-full min-w-0 flex-col rounded-xl border bg-[#040914]/80 p-5 text-left transition-all max-sm:min-h-[3.25rem] max-sm:flex-row max-sm:items-start max-sm:gap-3 sm:order-0 hover:border-[#00f0ff]/35 hover:bg-[#061125]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/50 ${
                    selected
                      ? 'border-[#00f0ff]/40 shadow-[inset_3px_0_0_#00f0ff]'
                      : 'border-[#00f0ff]/10'
                  }`}
                  aria-pressed={selected}
                  aria-expanded={selected}
                  aria-controls={selected ? 'job-panel' : undefined}
                  onClick={() => {
                    setActiveId(selected ? '' : job.id);
                    setCopied(false);
                  }}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold text-white max-sm:text-base max-sm:tracking-tight">
                      {job.title}
                    </span>
                    <span className="mt-1 text-sm text-slate-400 leading-relaxed">
                      {presentInlineMarkdown(job.blurb)}
                    </span>
                  </span>
                  <span className="mt-3 flex items-center gap-1 border-t border-[#00f0ff]/10 pt-3 text-xs font-semibold text-[#00f0ff] max-sm:mt-0.5 max-sm:max-w-[4.75rem] max-sm:flex-none max-sm:flex-col max-sm:items-end max-sm:gap-0.5 max-sm:border-0 max-sm:pt-0 max-sm:text-right max-sm:leading-tight">
                    <span>{selected ? 'Hide steps' : 'Show steps'}</span>
                    <JobCueIcon expanded={selected} />
                  </span>
                </button>
                {selected && active ? (
                  <JobPanel copied={copied} job={active} onCopied={setCopied} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function JobPanel({
  job,
  copied,
  onCopied,
}: {
  job: TodayJob;
  copied: boolean;
  onCopied: (copied: boolean) => void;
}) {
  const startIsPath = isTodayJobPath(job.cmd);
  const startHref = startIsPath ? resolveTodayJobHref(job.cmd) : null;

  return (
    <div
      className="rounded-xl border border-[#00f0ff]/20 bg-[#061125]/70 p-5 sm:col-span-full sm:order-last sm:p-6"
      id="job-panel"
      role="region"
      aria-labelledby="job-panel-title"
    >
      <h3 id="job-panel-title" className="text-base font-semibold text-white max-sm:sr-only">
        {job.title}
      </h3>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed max-sm:mt-0">{job.why}</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300 leading-relaxed">
        {job.steps.map(step => (
          <li key={step}>{presentInlineMarkdown(step)}</li>
        ))}
      </ol>
      <p className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="shrink-0 text-xs font-mono uppercase tracking-wider text-slate-500">
          Start here:
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 max-sm:flex-wrap">
          {startHref ? (
            <a
              href={startHref}
              className="min-w-0 font-mono text-sm text-[#00f0ff] hover:text-white max-sm:whitespace-pre-wrap max-sm:break-words sm:truncate"
            >
              {job.cmd}
            </a>
          ) : (
            <code
              title={job.cmd}
              className="min-w-0 rounded border border-white/5 bg-slate-950/80 px-2 py-1 font-mono text-sm text-[#00f0ff] max-sm:whitespace-pre-wrap max-sm:break-words sm:truncate"
            >
              {job.cmd}
            </code>
          )}
          <button
            type="button"
            className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/5 max-sm:min-h-10 max-sm:px-3"
            aria-label={`Copy command: ${job.cmd}`}
            onClick={() => {
              void navigator.clipboard?.writeText(job.cmd).then(() => {
                onCopied(true);
                window.setTimeout(() => onCopied(false), 1500);
              });
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {job.actions.map(action => {
          const href = resolveTodayJobHref(action.href);
          return (
            <li key={action.href}>
              <a
                href={href}
                className="text-xs font-semibold text-[#00f0ff] hover:text-white max-sm:inline-flex max-sm:min-h-10 max-sm:items-center max-sm:text-sm"
              >
                {action.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function JobCueIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${expanded ? 'rotate-180' : ''} motion-reduce:transition-none transition-transform`}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3.2 5.3a.75.75 0 0 1 1.06 0L8 9.04l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L3.2 6.36a.75.75 0 0 1 0-1.06z"
      />
    </svg>
  );
}
