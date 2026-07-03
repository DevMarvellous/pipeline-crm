import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { Lead } from '../types';
import { useLeads } from '../lib/store';
import { dayOf, isOverdue, isToday, todayString } from '../lib/dates';
import { LeadCard } from '../components/LeadCard';
import { MarkContactedButton, QuickActions } from '../components/QuickActions';
import { SnoozeMenu } from '../components/SnoozeMenu';
import { EmptyState } from '../components/EmptyState';
import { CheckIcon } from '../components/Icons';

function isActionable(lead: Lead): boolean {
  return lead.status !== 'closed' && lead.status !== 'dead';
}

function isSnoozedNow(lead: Lead): boolean {
  return !!lead.snoozedUntil && dayOf(lead.snoozedUntil) > todayString();
}

function Section({
  label,
  tone,
  leads,
}: {
  label: string;
  tone: 'overdue' | 'today' | 'upcoming';
  leads: Lead[];
}) {
  if (leads.length === 0) return null;
  const toneCls = tone === 'overdue' ? 'text-danger' : tone === 'today' ? 'text-warm' : 'text-ink-faint';
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className={`overline-label ${toneCls}`}>{label}</h2>
        <span className="text-[11px] font-medium text-ink-faint">{leads.length}</span>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            dueTone={tone}
            footer={
              <QuickActions
                lead={lead}
                variant="row"
                extra={
                  <>
                    <SnoozeMenu lead={lead} variant="icon" />
                    <MarkContactedButton lead={lead} />
                  </>
                }
              />
            }
          />
        ))}
      </div>
    </section>
  );
}

export function Today() {
  const leads = useLeads();
  const navigate = useNavigate();

  const { overdue, dueToday, upcoming } = useMemo(() => {
    const active = leads.filter((l) => l.nextFollowUp && isActionable(l) && !isSnoozedNow(l));
    const byDate = (a: Lead, b: Lead) => dayOf(a.nextFollowUp!).localeCompare(dayOf(b.nextFollowUp!));
    const today = todayString();
    const horizon = dayOf(new Date(new Date().setDate(new Date().getDate() + 3)).toISOString());
    return {
      overdue: active.filter((l) => isOverdue(l.nextFollowUp!)).sort(byDate),
      dueToday: active.filter((l) => isToday(l.nextFollowUp!)).sort(byDate),
      upcoming: active
        .filter((l) => dayOf(l.nextFollowUp!) > today && dayOf(l.nextFollowUp!) <= horizon)
        .sort(byDate),
    };
  }, [leads]);

  const nothingDue = overdue.length === 0 && dueToday.length === 0;

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Today</h1>
        <p className="text-[13px] text-ink-dim">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {nothingDue && upcoming.length === 0 ? (
        <EmptyState
          icon={<CheckIcon size={40} strokeWidth={1.5} />}
          title="All caught up"
          message="No follow-ups due. Met someone new? Get them in before you forget."
          action={
            <button
              onClick={() => navigate('/add')}
              className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink active:opacity-80"
            >
              Add lead
            </button>
          }
        />
      ) : (
        <>
          {nothingDue && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-dim">
              <CheckIcon size={16} className="shrink-0 text-accent" />
              Nothing due today — you're ahead of it.
            </div>
          )}
          <Section label="Overdue" tone="overdue" leads={overdue} />
          <Section label="Today" tone="today" leads={dueToday} />
          <Section label="Next 3 days" tone="upcoming" leads={upcoming} />
        </>
      )}
    </div>
  );
}
