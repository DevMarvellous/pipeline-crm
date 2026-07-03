import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { Lead } from '../types';
import { leadSummary } from '../lib/format';
import { relativeDayLabel } from '../lib/dates';
import { TempDot } from './TempDot';
import { StatusPill } from './StatusPill';

interface Props {
  lead: Lead;
  /** Optional row rendered under the summary (e.g. quick actions on Today). */
  footer?: ReactNode;
  /** Tint for the follow-up label: set on Today to signal urgency. */
  dueTone?: 'overdue' | 'today' | 'upcoming';
}

const DUE_TONE = {
  overdue: 'text-danger',
  today: 'text-warm',
  upcoming: 'text-ink-faint',
};

export function LeadCard({ lead, footer, dueTone }: Props) {
  const navigate = useNavigate();
  const summary = leadSummary(lead);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        onClick={() => navigate(`/leads/${lead.id}`)}
        className="block w-full px-4 py-3 text-left transition-colors active:bg-surface2"
      >
        <div className="flex items-center gap-2.5">
          <TempDot temp={lead.temperature} />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{lead.name}</span>
          {lead.nextFollowUp && dueTone && (
            <span className={`shrink-0 text-xs font-medium ${DUE_TONE[dueTone]}`}>
              {relativeDayLabel(lead.nextFollowUp)}
            </span>
          )}
          {!dueTone && <StatusPill status={lead.status} className="shrink-0" />}
        </div>
        {summary && <p className="mt-1 truncate pl-[22px] text-[13px] text-ink-dim">{summary}</p>}
      </button>
      {footer && <div className="border-t border-line/60 px-2 py-1.5">{footer}</div>}
    </div>
  );
}
