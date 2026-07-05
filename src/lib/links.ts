import type { Lead } from '../types';

/** Digits for wa.me: strip formatting, convert Nigerian local 0xxx → 234xxx. */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return '234' + digits.slice(1);
  return digits;
}

function firstName(lead: Lead): string {
  return lead.name.trim().split(/\s+/)[0] || 'there';
}

function topic(lead: Lead): string {
  if (lead.location) return lead.location;
  if (lead.propertyType) {
    return { land: 'the land', rental: 'the rental', buy: 'the property purchase', lease: 'the lease', other: 'the property' }[
      lead.propertyType
    ];
  }
  return 'your property search';
}

export function telLink(lead: Lead): string {
  return `tel:${lead.phone.replace(/[^\d+]/g, '')}`;
}

export function whatsAppLink(lead: Lead): string {
  const msg = `Hi ${firstName(lead)}, following up on our conversation about ${topic(lead)}.`;
  return `https://wa.me/${phoneDigits(lead.phone)}?text=${encodeURIComponent(msg)}`;
}

/** wa.me link pre-filled with a specific message (e.g. an AI-generated script). */
export function whatsAppLinkWithText(lead: Lead, text: string): string {
  return `https://wa.me/${phoneDigits(lead.phone)}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(lead: Lead): string {
  const subject = `Following up — ${lead.propertyType ? `${lead.propertyType} in ${lead.location ?? 'your area'}` : 'property search'}`;
  const body = `Hi ${firstName(lead)},\n\nFollowing up on our conversation about ${topic(lead)}. Let me know a good time to talk.\n\nBest regards`;
  return `mailto:${lead.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
