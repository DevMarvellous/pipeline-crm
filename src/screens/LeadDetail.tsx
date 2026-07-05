import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { InteractionType, Lead, LeadStatus, PropertyType } from '../types';
import { INTERACTION_TYPES, LEAD_STATUSES, PROPERTY_TYPES, TEMPERATURES } from '../types';
import { db } from '../lib/db';
import { useLead } from '../lib/store';
import { dayOf, formatDateTime, relativeDayLabel, todayString } from '../lib/dates';
import { QuickActions } from '../components/QuickActions';
import { SnoozeMenu } from '../components/SnoozeMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { VoiceNoteInput } from '../components/VoiceNoteInput';
import { ScriptGenerator } from '../components/ScriptGenerator';
import { ChevronLeftIcon, ClockIcon, PlusIcon, TrashIcon } from '../components/Icons';

const inputCls =
  'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none placeholder:text-ink-faint focus:border-accent/50';

const TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
  meeting: 'Meeting',
  other: 'Other',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

function LogInteractionForm({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [type, setType] = useState<InteractionType>('call');
  const [note, setNote] = useState('');
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap gap-1.5">
        {INTERACTION_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`h-8 rounded-full border px-3 text-[13px] font-medium transition-colors ${
              type === t ? 'border-accent/40 bg-accent/15 text-accent' : 'border-line text-ink-dim'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="mt-2.5">
        <VoiceNoteInput
          autoFocus
          value={note}
          onChange={setNote}
          placeholder="Called, said call back Friday…"
          rows={3}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={onClose} className="h-10 flex-1 rounded-xl border border-line text-sm font-medium text-ink-dim">
          Cancel
        </button>
        <button
          disabled={!note.trim()}
          onClick={() => {
            db.addInteraction(lead.id, { date: new Date().toISOString(), note: note.trim(), type });
            onClose();
          }}
          className="h-10 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-ink disabled:opacity-40"
        >
          Log it
        </button>
      </div>
    </div>
  );
}

export function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lead = useLead(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [logging, setLogging] = useState(false);

  if (!lead) {
    return (
      <EmptyState
        title="Lead not found"
        message="It may have been deleted."
        action={
          <button onClick={() => navigate('/leads')} className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink">
            All leads
          </button>
        }
      />
    );
  }

  const patch = (p: Partial<Lead>) => db.updateLead(lead.id, p);
  const isSnoozed = !!lead.snoozedUntil && dayOf(lead.snoozedUntil) > todayString();

  return (
    <div key={lead.id} className="mx-auto max-w-md space-y-5 md:max-w-2xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim active:bg-surface2"
        >
          <ChevronLeftIcon size={22} />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete lead"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-faint active:bg-surface2 active:text-danger"
        >
          <TrashIcon size={19} />
        </button>
      </div>

      {/* Name + temperature */}
      <div>
        <input
          defaultValue={lead.name}
          onBlur={(e) => e.target.value.trim() && patch({ name: e.target.value.trim() })}
          aria-label="Name"
          className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none"
        />
        <div className="mt-2 flex gap-2">
          {TEMPERATURES.map((t) => (
            <button
              key={t}
              onClick={() => patch({ temperature: t })}
              className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-medium capitalize transition-colors ${
                lead.temperature === t ? 'border-accent/40 bg-accent/10 text-ink' : 'border-line text-ink-faint'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${{ hot: 'bg-hot', warm: 'bg-warm', cold: 'bg-cold' }[t]}`} />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <QuickActions lead={lead} variant="bar" />

      {/* AI outreach script */}
      <ScriptGenerator lead={lead} />

      {/* Status */}
      <div>
        <span className="overline-label">Status</span>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {LEAD_STATUSES.map((s: LeadStatus) => (
            <button
              key={s}
              onClick={() => patch({ status: s })}
              className={`h-10 rounded-xl border text-[13px] font-medium capitalize transition-colors ${
                lead.status === s
                  ? 'border-accent/40 bg-accent/15 text-accent'
                  : 'border-line bg-surface text-ink-dim'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <span className="overline-label">Next follow-up</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={lead.nextFollowUp ? dayOf(lead.nextFollowUp) : ''}
            onChange={(e) => patch({ nextFollowUp: e.target.value || undefined })}
            className="h-11 flex-1 rounded-xl border border-line bg-bg px-3.5 text-[15px] outline-none focus:border-accent/50"
          />
          <SnoozeMenu lead={lead} variant="button" />
        </div>
        {lead.nextFollowUp && (
          <p className="mt-2 text-[13px] text-ink-dim">
            Due {relativeDayLabel(lead.nextFollowUp).toLowerCase()}
            {isSnoozed && (
              <span className="ml-1 inline-flex items-center gap-1 text-warm">
                <ClockIcon size={13} /> snoozed until {relativeDayLabel(lead.snoozedUntil!).toLowerCase()}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Contact + qualification details */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input defaultValue={lead.phone} type="tel" inputMode="tel" onBlur={(e) => patch({ phone: e.target.value.trim() })} className={inputCls} />
          </Field>
          <Field label="Email">
            <input defaultValue={lead.email ?? ''} type="email" onBlur={(e) => patch({ email: e.target.value.trim() || undefined })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <input defaultValue={lead.source} onBlur={(e) => patch({ source: e.target.value.trim() })} placeholder="event, referral…" className={inputCls} />
          </Field>
          <Field label="Location / axis">
            <input defaultValue={lead.location ?? ''} onBlur={(e) => patch({ location: e.target.value.trim() || undefined })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property type">
            <select
              value={lead.propertyType ?? ''}
              onChange={(e) => patch({ propertyType: (e.target.value || undefined) as PropertyType | undefined })}
              className={inputCls}
            >
              <option value="">—</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags">
            <input
              defaultValue={lead.tags.join(', ')}
              onBlur={(e) =>
                patch({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim().replace(/^#/, ''))
                    .filter(Boolean),
                })
              }
              placeholder="investor, urgent"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget min (₦)">
            <input
              defaultValue={lead.budgetMin ?? ''}
              type="number"
              inputMode="numeric"
              onBlur={(e) => patch({ budgetMin: e.target.value ? Number(e.target.value) : undefined })}
              className={inputCls}
            />
          </Field>
          <Field label="Budget max (₦)">
            <input
              defaultValue={lead.budgetMax ?? ''}
              type="number"
              inputMode="numeric"
              onBlur={(e) => patch({ budgetMax: e.target.value ? Number(e.target.value) : undefined })}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            defaultValue={lead.notes}
            onBlur={(e) => patch({ notes: e.target.value })}
            rows={4}
            placeholder="What do they want?"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none placeholder:text-ink-faint focus:border-accent/50"
          />
        </Field>
      </div>

      {/* Interactions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="overline-label">History</span>
          {!logging && (
            <button
              onClick={() => setLogging(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-accent active:bg-surface2"
            >
              <PlusIcon size={15} /> Log interaction
            </button>
          )}
        </div>
        {logging && <LogInteractionForm lead={lead} onClose={() => setLogging(false)} />}
        <div className="mt-2 space-y-px overflow-hidden rounded-xl border border-line">
          {lead.interactions.length === 0 && !logging && (
            <p className="bg-surface px-4 py-5 text-center text-[13px] text-ink-faint">
              No interactions yet. Quick actions log them automatically.
            </p>
          )}
          {lead.interactions.map((i) => (
            <div key={i.id} className="bg-surface px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {TYPE_LABELS[i.type]}
                </span>
                <span className="text-[11px] text-ink-faint">{formatDateTime(i.date)}</span>
              </div>
              <p className="mt-0.5 text-[14px] text-ink">{i.note}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] text-ink-faint">
        Added {formatDateTime(lead.createdAt)}
      </p>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${lead.name}?`}
        message="This removes the lead and its whole interaction history. There is no undo."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          db.deleteLead(lead.id);
          navigate('/leads', { replace: true });
        }}
      />
    </div>
  );
}
