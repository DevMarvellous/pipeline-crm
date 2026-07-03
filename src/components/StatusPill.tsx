import type { LeadStatus } from '../types';

const STYLES: Record<LeadStatus, string> = {
  new: 'bg-cold/15 text-cold',
  contacted: 'bg-violet-500/15 text-violet-500 dark:text-violet-400',
  viewing: 'bg-warm/15 text-warm',
  negotiating: 'bg-orange-500/15 text-orange-500 dark:text-orange-400',
  closed: 'bg-accent/15 text-accent',
  dead: 'bg-ink-faint/15 text-ink-faint',
};

export function StatusPill({ status, className = '' }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STYLES[status]} ${className}`}
    >
      {status}
    </span>
  );
}
