import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Lead, LeadStatus, Temperature } from '../types';
import { LEAD_STATUSES, TEMPERATURES } from '../types';
import { useLeads } from '../lib/store';
import { dayOf } from '../lib/dates';
import { LeadCard } from '../components/LeadCard';
import { EmptyState } from '../components/EmptyState';
import { SearchIcon, UsersIcon, XIcon } from '../components/Icons';

type SortKey = 'updated' | 'name' | 'followUp';

const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Recently updated',
  name: 'Name',
  followUp: 'Next follow-up',
};

function matchesQuery(lead: Lead, q: string): boolean {
  const hay = [lead.name, lead.phone, lead.location ?? '', lead.notes, ...lead.tags]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium capitalize transition-colors ${
        active
          ? 'border-accent/40 bg-accent/15 text-accent'
          : 'border-line bg-surface text-ink-dim active:bg-surface2'
      }`}
    >
      {label}
    </button>
  );
}

export function AllLeads() {
  const leads = useLeads();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [temp, setTemp] = useState<Temperature | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('updated');

  const allTags = useMemo(
    () => [...new Set(leads.flatMap((l) => l.tags))].sort(),
    [leads]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = leads.filter(
      (l) =>
        (!q || matchesQuery(l, q)) &&
        (!status || l.status === status) &&
        (!temp || l.temperature === temp) &&
        (!tag || l.tags.includes(tag))
    );
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'followUp') {
        // Leads without a follow-up sink to the bottom
        const av = a.nextFollowUp ? dayOf(a.nextFollowUp) : '9999';
        const bv = b.nextFollowUp ? dayOf(b.nextFollowUp) : '9999';
        return av.localeCompare(bv);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [leads, query, status, temp, tag, sort]);

  const hasFilters = status !== null || temp !== null || tag !== null;

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon size={40} strokeWidth={1.5} />}
        title="No leads yet"
        message="Every contact you meet goes here. Add your first lead and Pipeline will keep track of the follow-up."
        action={
          <button
            onClick={() => navigate('/add')}
            className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink active:opacity-80"
          >
            Add lead
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 bg-bg px-4 pb-2 pt-1 md:mx-0 md:px-0">
        <div className="relative">
          <SearchIcon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, tags, notes…"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-[15px] outline-none placeholder:text-ink-faint focus:border-accent/50"
          />
        </div>

        <div className="scrollbar-none -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {hasFilters && (
            <button
              onClick={() => {
                setStatus(null);
                setTemp(null);
                setTag(null);
              }}
              aria-label="Clear filters"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-dim"
            >
              <XIcon size={14} />
            </button>
          )}
          {TEMPERATURES.map((t) => (
            <Chip key={t} label={t} active={temp === t} onClick={() => setTemp(temp === t ? null : t)} />
          ))}
          {LEAD_STATUSES.map((s) => (
            <Chip key={s} label={s} active={status === s} onClick={() => setStatus(status === s ? null : s)} />
          ))}
          {allTags.map((t) => (
            <Chip key={`tag-${t}`} label={`#${t}`} active={tag === t} onClick={() => setTag(tag === t ? null : t)} />
          ))}
        </div>
      </div>

      <div className="mb-2 mt-1 flex items-center justify-between">
        <span className="text-xs text-ink-faint">
          {visible.length} {visible.length === 1 ? 'lead' : 'leads'}
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort leads"
          className="rounded-lg border-none bg-transparent text-xs font-medium text-ink-dim outline-none"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {visible.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {visible.length === 0 && (
          <EmptyState
            title="No matches"
            message="Try a different search or clear the filters."
          />
        )}
      </div>
    </div>
  );
}
