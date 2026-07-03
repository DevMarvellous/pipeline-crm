// The single persistence module. Everything else imports only from here (or
// from store.ts, which wraps this). To move to Supabase later, reimplement
// this file's exported `db` object — no UI code touches localStorage.

import type { Interaction, Lead, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { dayOf, todayString } from './dates';

const STORAGE_KEY = 'pipeline.data.v1';
const SCHEMA_VERSION = 1;

interface AppData {
  schemaVersion: number;
  leads: Lead[];
  settings: Settings;
}

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

function emptyData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, leads: [], settings: { ...DEFAULT_SETTINGS } };
}

let cache: AppData | null = null;

function load(): AppData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = emptyData();
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    cache = {
      schemaVersion: SCHEMA_VERSION,
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    // Corrupt storage: start fresh rather than crash. The weekly export nag
    // exists precisely so this is recoverable.
    cache = emptyData();
  }
  return cache;
}

function save(data: AppData): void {
  cache = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

/** Minimal shape check for imported leads; fills gaps with safe defaults. */
function normalizeLead(raw: unknown): Lead | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.trim() === '') return null;
  const ts = now();
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name: r.name,
    phone: typeof r.phone === 'string' ? r.phone : '',
    email: typeof r.email === 'string' ? r.email : undefined,
    source: typeof r.source === 'string' ? r.source : '',
    propertyType: typeof r.propertyType === 'string' ? (r.propertyType as Lead['propertyType']) : undefined,
    budgetMin: typeof r.budgetMin === 'number' ? r.budgetMin : undefined,
    budgetMax: typeof r.budgetMax === 'number' ? r.budgetMax : undefined,
    location: typeof r.location === 'string' ? r.location : undefined,
    temperature: r.temperature === 'hot' || r.temperature === 'cold' ? r.temperature : 'warm',
    status:
      r.status === 'contacted' || r.status === 'viewing' || r.status === 'negotiating' || r.status === 'closed' || r.status === 'dead'
        ? r.status
        : 'new',
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    notes: typeof r.notes === 'string' ? r.notes : '',
    interactions: Array.isArray(r.interactions)
      ? (r.interactions as Interaction[]).filter((i) => i && typeof i.note === 'string' && typeof i.date === 'string')
      : [],
    nextFollowUp: typeof r.nextFollowUp === 'string' ? r.nextFollowUp : undefined,
    snoozedUntil: typeof r.snoozedUntil === 'string' ? r.snoozedUntil : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : ts,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : ts,
  };
}

export type CreateLeadInput = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'interactions'>;

export const db = {
  /** Re-render hook for the UI store; returns an unsubscribe function. */
  subscribe(listener: ChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getAllLeads(): Lead[] {
    return load().leads;
  },

  getLead(id: string): Lead | null {
    return load().leads.find((l) => l.id === id) ?? null;
  },

  createLead(input: CreateLeadInput): Lead {
    const ts = now();
    const lead: Lead = { ...input, id: newId(), interactions: [], createdAt: ts, updatedAt: ts };
    const data = load();
    save({ ...data, leads: [lead, ...data.leads] });
    return lead;
  },

  updateLead(id: string, patch: Partial<Lead>): Lead {
    const data = load();
    const existing = data.leads.find((l) => l.id === id);
    if (!existing) throw new Error(`Lead not found: ${id}`);
    const updated: Lead = { ...existing, ...patch, id, createdAt: existing.createdAt, updatedAt: now() };
    save({ ...data, leads: data.leads.map((l) => (l.id === id ? updated : l)) });
    return updated;
  },

  deleteLead(id: string): void {
    const data = load();
    save({ ...data, leads: data.leads.filter((l) => l.id !== id) });
  },

  addInteraction(leadId: string, interaction: Omit<Interaction, 'id'>): Lead {
    const full: Interaction = { ...interaction, id: newId() };
    const data = load();
    const existing = data.leads.find((l) => l.id === leadId);
    if (!existing) throw new Error(`Lead not found: ${leadId}`);
    const updated: Lead = {
      ...existing,
      interactions: [full, ...existing.interactions],
      updatedAt: now(),
    };
    save({ ...data, leads: data.leads.map((l) => (l.id === leadId ? updated : l)) });
    return updated;
  },

  /** Leads due today or overdue, excluding snoozed and closed/dead leads. */
  getDueFollowUps(asOf: Date = new Date()): Lead[] {
    const today = todayString(asOf);
    return load()
      .leads.filter((l) => {
        if (!l.nextFollowUp) return false;
        if (l.status === 'closed' || l.status === 'dead') return false;
        if (l.snoozedUntil && dayOf(l.snoozedUntil) > today) return false;
        return dayOf(l.nextFollowUp) <= today;
      })
      .sort((a, b) => dayOf(a.nextFollowUp!).localeCompare(dayOf(b.nextFollowUp!)));
  },

  exportAll(): string {
    const data = load();
    return JSON.stringify({ schemaVersion: data.schemaVersion, exportedAt: now(), leads: data.leads }, null, 2);
  },

  importAll(json: string, mode: 'merge' | 'replace'): { added: number; updated: number } {
    const parsed = JSON.parse(json) as unknown;
    const rawLeads: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { leads?: unknown[] }).leads)
        ? (parsed as { leads: unknown[] }).leads
        : [];
    const incoming = rawLeads.map(normalizeLead).filter((l): l is Lead => l !== null);
    if (rawLeads.length > 0 && incoming.length === 0) {
      throw new Error('No valid leads found in file');
    }

    const data = load();
    if (mode === 'replace') {
      save({ ...data, leads: incoming });
      return { added: incoming.length, updated: 0 };
    }

    const byId = new Map(data.leads.map((l) => [l.id, l]));
    let added = 0;
    let updated = 0;
    for (const lead of incoming) {
      if (byId.has(lead.id)) {
        byId.set(lead.id, lead);
        updated++;
      } else {
        byId.set(lead.id, lead);
        added++;
      }
    }
    save({ ...data, leads: [...byId.values()] });
    return { added, updated };
  },

  getSettings(): Settings {
    return load().settings;
  },

  updateSettings(patch: Partial<Settings>): Settings {
    const data = load();
    const settings = { ...data.settings, ...patch };
    save({ ...data, settings });
    return settings;
  },

  clearAll(): void {
    save(emptyData());
  },

  /** Test-only: drop the in-memory cache so the next read hits storage. */
  _resetCache(): void {
    cache = null;
  },
};
