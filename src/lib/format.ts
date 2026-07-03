import type { Lead } from '../types';

const PROPERTY_LABELS: Record<string, string> = {
  land: 'Land',
  rental: 'Rental',
  buy: 'Buying',
  lease: 'Lease',
  other: 'Property',
};

/** ₦5m, ₦250k, ₦1.5b — compact naira for card summaries. */
export function formatNaira(n: number): string {
  if (n >= 1_000_000_000) return `₦${trim(n / 1_000_000_000)}b`;
  if (n >= 1_000_000) return `₦${trim(n / 1_000_000)}m`;
  if (n >= 1_000) return `₦${trim(n / 1_000)}k`;
  return `₦${n}`;
}

function trim(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}

export function formatBudget(lead: Lead): string | null {
  const { budgetMin, budgetMax } = lead;
  if (budgetMin != null && budgetMax != null) return `${formatNaira(budgetMin)}–${formatNaira(budgetMax)}`;
  if (budgetMax != null) return `up to ${formatNaira(budgetMax)}`;
  if (budgetMin != null) return `from ${formatNaira(budgetMin)}`;
  return null;
}

/** One line of "what they want": Land · Ede · ₦5m–₦10m */
export function leadSummary(lead: Lead): string {
  const parts: string[] = [];
  if (lead.propertyType) parts.push(PROPERTY_LABELS[lead.propertyType] ?? lead.propertyType);
  if (lead.location) parts.push(lead.location);
  const budget = formatBudget(lead);
  if (budget) parts.push(budget);
  if (parts.length === 0 && lead.notes) return lead.notes.split('\n')[0].slice(0, 80);
  return parts.join(' · ');
}

/** Light display formatting; storage stays raw. +2348012345678 → +234 801 234 5678 */
export function formatPhone(phone: string): string {
  const raw = phone.trim();
  const m = raw.match(/^\+?234(\d{3})(\d{3})(\d{4})$/);
  if (m) return `+234 ${m[1]} ${m[2]} ${m[3]}`;
  const local = raw.match(/^0(\d{3})(\d{3})(\d{4})$/);
  if (local) return `0${local[1]} ${local[2]} ${local[3]}`;
  return raw;
}
