import React from 'react';

type Status = 'active' | 'standby' | 'jailed' | 'at-risk' | undefined;

const statusClasses: Record<Exclude<Status, undefined>, string> = {
  active: 'bg-green-500',
  standby: 'bg-yellow-500',
  jailed: 'bg-red-500',
  'at-risk': 'bg-purple-500',
};

export const LpStatusBadge: React.FC<{ status?: Status }> = ({ status }) => {
  if (!status) return null;
  const className = statusClasses[status];
  const label = status.replace('-', ' ');
  return (
    <span className={`px-2 py-1 rounded text-sm font-medium text-white ${className}`}>
      {label}
    </span>
  );
};
