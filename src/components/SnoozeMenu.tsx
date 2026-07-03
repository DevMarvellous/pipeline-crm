import { useState } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/db';
import { addDaysString } from '../lib/dates';
import { ClockIcon } from './Icons';

const PRESETS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

interface Props {
  lead: Lead;
  /** 'icon' = compact trigger for card rows; 'button' = labelled for Lead Detail. */
  variant: 'icon' | 'button';
}

export function SnoozeMenu({ lead, variant }: Props) {
  const [open, setOpen] = useState(false);

  function snooze(until: string) {
    db.updateLead(lead.id, { snoozedUntil: until });
    setOpen(false);
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          aria-label="Snooze"
          title="Snooze"
          onClick={() => setOpen(true)}
          className="flex h-11 min-w-11 flex-1 items-center justify-center rounded-lg text-ink-dim transition-colors active:bg-surface2"
        >
          <ClockIcon size={18} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink-dim active:bg-surface2"
        >
          <ClockIcon size={16} />
          Snooze
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Snooze lead"
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 px-1 text-base font-semibold">Snooze {lead.name.split(' ')[0]} until…</h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => snooze(addDaysString(p.days))}
                  className="h-12 rounded-xl border border-line bg-surface2 text-sm font-medium active:opacity-70"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-dim">Custom date</span>
              <input
                type="date"
                min={addDaysString(1)}
                onChange={(e) => e.target.value && snooze(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none focus:border-accent/50"
              />
            </label>
            {lead.snoozedUntil && (
              <button
                onClick={() => {
                  db.updateLead(lead.id, { snoozedUntil: undefined });
                  setOpen(false);
                }}
                className="mt-3 h-11 w-full rounded-xl text-sm font-medium text-danger active:bg-surface2"
              >
                Clear snooze
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
