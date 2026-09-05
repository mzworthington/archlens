import React from 'react';
import {
  intentCardClass,
  intentHeadingRowClass,
  intentHeadingTitleClass,
} from './workspaceEntryChrome';

export type WorkspaceIntentCardProps = {
  testId: string;
  titleId: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

export const WorkspaceIntentCard: React.FC<WorkspaceIntentCardProps> = ({
  testId,
  titleId,
  title,
  subtitle,
  icon,
  children,
}) => (
  <section className={intentCardClass} data-testid={testId} aria-labelledby={titleId}>
    <div className={intentHeadingRowClass}>
      {icon}
      <div>
        <h3 id={titleId} className={intentHeadingTitleClass}>
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-1.5">{children}</div>
  </section>
);
