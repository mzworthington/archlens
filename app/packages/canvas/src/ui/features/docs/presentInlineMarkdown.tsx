import type { ReactNode } from 'react';
import { resolveTodayJobHref } from './parseTodayJobs';

const TOKEN = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;

/** Turn a short markdown phrase into nodes. Links, code and bold only. */
export function presentInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(TOKEN);
  return parts.map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = resolveTodayJobHref(link[2]!);
      const label = link[1]!;
      return (
        <a key={index} href={href}>
          {label}
        </a>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
