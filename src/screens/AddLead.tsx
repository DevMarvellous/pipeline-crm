import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { PropertyType, Temperature } from '../types';
import { PROPERTY_TYPES, TEMPERATURES } from '../types';
import { db } from '../lib/db';
import { VoiceNoteInput } from '../components/VoiceNoteInput';

const inputCls =
  'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none placeholder:text-ink-faint focus:border-accent/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

export function AddLead() {
  const navigate = useNavigate();
  const [full, setFull] = useState(false);

  // Quick fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Full fields
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [location, setLocation] = useState('');
  const [temperature, setTemperature] = useState<Temperature>('warm');
  const [tags, setTags] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');

  const canSave = name.trim().length > 0;

  function save() {
    if (!canSave) return;
    const lead = db.createLead({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      source: source.trim(),
      propertyType: propertyType || undefined,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      location: location.trim() || undefined,
      temperature,
      status: 'new',
      tags: tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean),
      notes: notes.trim(),
      nextFollowUp: nextFollowUp || undefined,
    });
    navigate(`/leads/${lead.id}`, { replace: true });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">New lead</h1>
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-[13px] font-medium">
          <button
            onClick={() => setFull(false)}
            className={`rounded-md px-3 py-1.5 transition-colors ${!full ? 'bg-surface2 text-ink' : 'text-ink-faint'}`}
          >
            Quick
          </button>
          <button
            onClick={() => setFull(true)}
            className={`rounded-md px-3 py-1.5 transition-colors ${full ? 'bg-surface2 text-ink' : 'text-ink-faint'}`}
          >
            Full
          </button>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Who did you meet?"
            className={inputCls}
            autoComplete="off"
          />
        </Field>

        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            type="tel"
            inputMode="tel"
            className={inputCls}
            autoComplete="off"
          />
        </Field>

        {full && (
          <>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com" className={inputCls} />
            </Field>
            <Field label="Source">
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="event, referral, Instagram…" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Property type">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType | '')}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location / axis">
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ede, Banana Island…" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget min (₦)">
                <input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} type="number" inputMode="numeric" placeholder="5000000" className={inputCls} />
              </Field>
              <Field label="Budget max (₦)">
                <input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} type="number" inputMode="numeric" placeholder="10000000" className={inputCls} />
              </Field>
            </div>
            <Field label="Temperature">
              <div className="flex gap-2">
                {TEMPERATURES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemperature(t)}
                    className={`h-10 flex-1 rounded-xl border text-sm font-medium capitalize transition-colors ${
                      temperature === t
                        ? 'border-accent/40 bg-accent/15 text-accent'
                        : 'border-line bg-surface text-ink-dim'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tags (comma-separated)">
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="investor, urgent" className={inputCls} />
            </Field>
            <Field label="Next follow-up">
              <input value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} type="date" className={inputCls} />
            </Field>
          </>
        )}

        <Field label="Notes">
          <VoiceNoteInput
            value={notes}
            onChange={setNotes}
            placeholder="What do they want? What did you agree?"
          />
        </Field>

        <button
          type="submit"
          disabled={!canSave}
          className="h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-40"
        >
          Save lead
        </button>
      </form>
    </div>
  );
}
