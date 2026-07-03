export type LeadStatus = 'new' | 'contacted' | 'viewing' | 'negotiating' | 'closed' | 'dead';
export type Temperature = 'hot' | 'warm' | 'cold';
export type PropertyType = 'land' | 'rental' | 'buy' | 'lease' | 'other';
export type InteractionType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'other';

export interface Interaction {
  id: string;
  date: string; // ISO
  note: string;
  type: InteractionType;
}

export interface Lead {
  id: string;
  name: string;
  phone: string; // stored raw, formatted on display
  email?: string;
  source: string;
  propertyType?: PropertyType;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  temperature: Temperature;
  status: LeadStatus;
  tags: string[];
  notes: string;
  interactions: Interaction[];
  nextFollowUp?: string; // ISO date (YYYY-MM-DD)
  snoozedUntil?: string; // ISO date (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePref;
  backupReminder: boolean;
  lastExportAt?: string; // ISO
  notificationsEnabled: boolean;
  lastNotifiedOn?: string; // YYYY-MM-DD, so we notify at most once per day
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  backupReminder: true,
  notificationsEnabled: false,
};

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'viewing', 'negotiating', 'closed', 'dead'];
export const TEMPERATURES: Temperature[] = ['hot', 'warm', 'cold'];
export const PROPERTY_TYPES: PropertyType[] = ['land', 'rental', 'buy', 'lease', 'other'];
export const INTERACTION_TYPES: InteractionType[] = ['call', 'whatsapp', 'email', 'meeting', 'other'];
