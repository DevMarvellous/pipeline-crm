import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-ink-faint">{icon}</div>}
      <h2 className="text-base font-semibold">{title}</h2>
      {message && <p className="mt-1 max-w-xs text-sm text-ink-dim">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
