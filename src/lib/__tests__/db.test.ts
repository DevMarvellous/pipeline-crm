import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import type { CreateLeadInput } from '../db';
import { addDaysString, todayString } from '../dates';

// Minimal localStorage stub for the Node test environment.
const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
};

function input(overrides: Partial<CreateLeadInput> = {}): CreateLeadInput {
  return {
    name: 'Test Lead',
    phone: '+2348012345678',
    source: 'event',
    temperature: 'warm',
    status: 'new',
    tags: [],
    notes: '',
    ...overrides,
  };
}

beforeEach(() => {
  storage.clear();
  db._resetCache();
});

describe('CRUD', () => {
  it('creates a lead with generated id and timestamps', () => {
    const lead = db.createLead(input());
    expect(lead.id).toBeTruthy();
    expect(lead.createdAt).toBeTruthy();
    expect(lead.interactions).toEqual([]);
    expect(db.getAllLeads()).toHaveLength(1);
    expect(db.getLead(lead.id)?.name).toBe('Test Lead');
  });

  it('persists across cache resets (real storage round-trip)', () => {
    const lead = db.createLead(input());
    db._resetCache();
    expect(db.getLead(lead.id)?.name).toBe('Test Lead');
  });

  it('updates a lead and bumps updatedAt, preserving id and createdAt', () => {
    const lead = db.createLead(input());
    const updated = db.updateLead(lead.id, { name: 'Renamed', id: 'hacked', createdAt: 'hacked' } as never);
    expect(updated.name).toBe('Renamed');
    expect(updated.id).toBe(lead.id);
    expect(updated.createdAt).toBe(lead.createdAt);
  });

  it('deletes a lead', () => {
    const lead = db.createLead(input());
    db.deleteLead(lead.id);
    expect(db.getAllLeads()).toHaveLength(0);
  });

  it('adds interactions newest-first', () => {
    const lead = db.createLead(input());
    db.addInteraction(lead.id, { date: '2026-01-01T10:00:00Z', note: 'first', type: 'call' });
    const after = db.addInteraction(lead.id, { date: '2026-01-02T10:00:00Z', note: 'second', type: 'whatsapp' });
    expect(after.interactions.map((i) => i.note)).toEqual(['second', 'first']);
    expect(after.interactions[0].id).toBeTruthy();
  });
});

describe('getDueFollowUps', () => {
  const today = todayString();

  it('includes overdue and today, excludes future', () => {
    db.createLead(input({ name: 'Overdue' }));
    const all = db.getAllLeads();
    db.updateLead(all[0].id, { nextFollowUp: addDaysString(-3) });
    const b = db.createLead(input({ name: 'DueToday' }));
    db.updateLead(b.id, { nextFollowUp: today });
    const c = db.createLead(input({ name: 'Future' }));
    db.updateLead(c.id, { nextFollowUp: addDaysString(2) });

    const due = db.getDueFollowUps();
    expect(due.map((l) => l.name)).toEqual(['Overdue', 'DueToday']); // overdue sorts first
  });

  it('excludes snoozed leads until the snooze date passes', () => {
    const a = db.createLead(input({ name: 'Snoozed' }));
    db.updateLead(a.id, { nextFollowUp: addDaysString(-1), snoozedUntil: addDaysString(3) });
    expect(db.getDueFollowUps()).toHaveLength(0);

    // snooze date reached → due again
    db.updateLead(a.id, { snoozedUntil: today });
    expect(db.getDueFollowUps().map((l) => l.name)).toEqual(['Snoozed']);
  });

  it('excludes closed and dead leads', () => {
    const a = db.createLead(input({ name: 'Dead', status: 'dead' }));
    db.updateLead(a.id, { nextFollowUp: addDaysString(-1) });
    const b = db.createLead(input({ name: 'Closed', status: 'closed' }));
    db.updateLead(b.id, { nextFollowUp: today });
    expect(db.getDueFollowUps()).toHaveLength(0);
  });

  it('ignores leads without a follow-up date', () => {
    db.createLead(input());
    expect(db.getDueFollowUps()).toHaveLength(0);
  });
});

describe('export / import', () => {
  it('round-trips through export → replace import', () => {
    db.createLead(input({ name: 'A' }));
    db.createLead(input({ name: 'B' }));
    const json = db.exportAll();

    db.clearAll();
    expect(db.getAllLeads()).toHaveLength(0);

    const result = db.importAll(json, 'replace');
    expect(result).toEqual({ added: 2, updated: 0 });
    expect(db.getAllLeads().map((l) => l.name).sort()).toEqual(['A', 'B']);
  });

  it('merge updates existing ids and adds new ones', () => {
    const a = db.createLead(input({ name: 'A' }));
    const json = JSON.stringify({
      leads: [
        { ...a, name: 'A-updated' },
        { id: 'new-id', name: 'C', phone: '123' },
      ],
    });
    const result = db.importAll(json, 'merge');
    expect(result).toEqual({ added: 1, updated: 1 });
    expect(db.getLead(a.id)?.name).toBe('A-updated');
    expect(db.getAllLeads()).toHaveLength(2);
  });

  it('normalizes malformed leads and rejects nameless ones', () => {
    const json = JSON.stringify({ leads: [{ name: 'Bare' }, { phone: 'no-name' }] });
    const result = db.importAll(json, 'merge');
    expect(result.added).toBe(1);
    const lead = db.getAllLeads()[0];
    expect(lead.temperature).toBe('warm');
    expect(lead.status).toBe('new');
    expect(lead.tags).toEqual([]);
  });

  it('throws on JSON with no usable leads', () => {
    expect(() => db.importAll('{"leads":[{"bogus":1}]}', 'merge')).toThrow();
    expect(() => db.importAll('not json', 'merge')).toThrow();
  });

  it('accepts a bare array export format', () => {
    const result = db.importAll(JSON.stringify([{ name: 'X', phone: '1' }]), 'merge');
    expect(result.added).toBe(1);
  });
});

describe('settings', () => {
  it('has defaults and applies patches', () => {
    expect(db.getSettings().theme).toBe('system');
    db.updateSettings({ theme: 'dark', notificationsEnabled: true });
    db._resetCache();
    expect(db.getSettings().theme).toBe('dark');
    expect(db.getSettings().notificationsEnabled).toBe(true);
    expect(db.getSettings().backupReminder).toBe(true); // untouched default
  });
});

describe('clearAll', () => {
  it('wipes leads and resets settings', () => {
    db.createLead(input());
    db.updateSettings({ theme: 'dark' });
    db.clearAll();
    expect(db.getAllLeads()).toHaveLength(0);
    expect(db.getSettings().theme).toBe('system');
  });
});
