import React from 'react';
import { optionClass } from './workspaceEntryChrome';

export type WorkspaceEntryOptionProps = {
  testId: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  titleExtra?: React.ReactNode;
  ariaDescribedBy?: string;
  descriptionClassName?: string;
};

export const WorkspaceEntryOption: React.FC<WorkspaceEntryOptionProps> = ({
  testId,
  onClick,
  disabled,
  icon,
  title,
  description,
  className = optionClass,
  titleExtra,
  ariaDescribedBy,
  descriptionClassName = 'text-slate-500',
}) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    disabled={disabled}
    className={className}
    aria-describedby={ariaDescribedBy}
  >
    {icon}
    <span className="min-w-0 flex-1">
      {titleExtra ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{title}</span>
          {titleExtra}
        </span>
      ) : (
        <span className="block text-sm font-semibold text-slate-100">{title}</span>
      )}
      <span className={`block text-xs ${descriptionClassName} mt-0.5`}>{description}</span>
    </span>
  </button>
);
