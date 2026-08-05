import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import type { DocsProductAction } from './pages';

type Props = {
  action: DocsProductAction;
};

export const DocsProductCta: React.FC<Props> = ({ action }) => {
  const className =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[#00f0ff]/90 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors';

  if (action.external) {
    return (
      <div className="mb-6" data-testid="docs-product-cta">
        <a href={action.href} target="_blank" rel="noreferrer" className={className}>
          {action.label}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="mb-6" data-testid="docs-product-cta">
      <Link href={action.href} className={className}>
        {action.label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
};
