import React from 'react';
import { LpPoolStatus } from '../../lib/types/lp';

type Status = LpPoolStatus | undefined;

const statusClasses: Record<Exclude<Status, undefined>, string> = {
  available: 'bg-green-500',
  staged: 'bg-yellow-500',
  suspended: 'bg-red-500',
  unknown: 'bg-zinc-500',
};

const textContrastClasses: Record<Exclude<Status, undefined>, string> = {
  available: 'text-white dark:text-white',
  staged: 'text-zinc-900 dark:text-white',
  suspended: 'text-white dark:text-white',
  unknown: 'text-white dark:text-white',
};

const statusLabels: Record<Exclude<Status, undefined>, string> = {
  available: 'Available',
  staged: 'Staged',
  suspended: 'Suspended',
  unknown: 'Unknown',
};

export const LpStatusBadge: React.FC<{ status?: Status }> = ({ status }) => {
  if (!status) return null;
  const bgClass = statusClasses[status];
  const textClass = textContrastClasses[status];
  return (
    <span className={`rounded px-2 py-1 text-sm font-medium ${bgClass} ${textClass}`}>
      {statusLabels[status]}
    </span>
  );
};
