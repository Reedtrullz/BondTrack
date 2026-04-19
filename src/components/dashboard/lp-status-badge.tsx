import React from 'react';

type Status = 'active' | 'standby' | 'jailed' | 'at-risk' | undefined;

const statusClasses: Record<Exclude<Status, undefined>, string> = {
  active: 'bg-green-500',
  standby: 'bg-yellow-500',
  jailed: 'bg-red-500',
  'at-risk': 'bg-purple-500',
};

// Light mode needs dark text for contrast, dark mode uses white text
const textContrastClasses: Record<Exclude<Status, undefined>, string> = {
  active: 'text-white dark:text-white',
  standby: 'text-zinc-900 dark:text-white',
  jailed: 'text-white dark:text-white',
  'at-risk': 'text-white dark:text-white',
};

export const LpStatusBadge: React.FC<{ status?: Status }> = ({ status }) => {
  if (!status) return null;
  const bgClass = statusClasses[status];
  const textClass = textContrastClasses[status];
  const label = status.replace('-', ' ');
  return (
    <span className={`rounded px-2 py-1 text-sm font-medium ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
};
