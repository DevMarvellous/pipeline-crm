import type { ReactNode } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/db';
import { mailtoLink, telLink, whatsAppLink } from '../lib/links';
import { CheckIcon, MailIcon, PhoneIcon, WhatsAppIcon } from './Icons';

// Every quick action passively logs an interaction — the history builds itself.
function logAction(lead: Lead, type: 'call' | 'whatsapp' | 'email', note: string) {
  db.addInteraction(lead.id, { date: new Date().toISOString(), note, type });
}

function Action({
  href,
  label,
  onClick,
  children,
  size,
}: {
  href?: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
  size: 'row' | 'bar';
}) {
  const cls =
    size === 'bar'
      ? 'flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface2 text-[10px] font-medium text-ink-dim transition-colors active:bg-line'
      : 'flex h-11 min-w-11 flex-1 items-center justify-center rounded-lg text-ink-dim transition-colors active:bg-surface2';
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" aria-label={label} title={label} onClick={onClick} className={cls}>
        {children}
        {size === 'bar' && label}
      </a>
    );
  }
  return (
    <button aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
      {size === 'bar' && label}
    </button>
  );
}

interface Props {
  lead: Lead;
  /** 'bar' = big labelled buttons (Lead Detail top), 'row' = compact icon row (Today cards). */
  variant: 'bar' | 'row';
  /** Extra actions appended after Call/WhatsApp/Email (e.g. Snooze on Today). */
  extra?: ReactNode;
}

export function QuickActions({ lead, variant, extra }: Props) {
  const hasPhone = lead.phone.trim().length > 0;
  const hasEmail = !!lead.email?.trim();
  return (
    <div className={variant === 'bar' ? 'flex gap-2' : 'flex items-center'}>
      {hasPhone && (
        <Action
          size={variant}
          href={telLink(lead)}
          label="Call"
          onClick={() => logAction(lead, 'call', 'Called via app')}
        >
          <PhoneIcon size={variant === 'bar' ? 19 : 18} />
        </Action>
      )}
      {hasPhone && (
        <Action
          size={variant}
          href={whatsAppLink(lead)}
          label="WhatsApp"
          onClick={() => logAction(lead, 'whatsapp', 'Sent WhatsApp via app')}
        >
          <WhatsAppIcon size={variant === 'bar' ? 19 : 18} />
        </Action>
      )}
      {hasEmail && (
        <Action
          size={variant}
          href={mailtoLink(lead)}
          label="Email"
          onClick={() => logAction(lead, 'email', 'Sent email via app')}
        >
          <MailIcon size={variant === 'bar' ? 19 : 18} />
        </Action>
      )}
      {extra}
    </div>
  );
}

/** "Mark contacted" — used on Today cards. */
export function MarkContactedButton({ lead, onDone }: { lead: Lead; onDone?: () => void }) {
  return (
    <button
      aria-label="Mark contacted"
      title="Mark contacted"
      onClick={() => {
        db.addInteraction(lead.id, {
          date: new Date().toISOString(),
          note: 'Marked contacted',
          type: 'other',
        });
        db.updateLead(lead.id, {
          status: lead.status === 'new' ? 'contacted' : lead.status,
          nextFollowUp: undefined,
          snoozedUntil: undefined,
        });
        onDone?.();
      }}
      className="flex h-11 min-w-11 flex-1 items-center justify-center rounded-lg text-accent transition-colors active:bg-surface2"
    >
      <CheckIcon size={18} />
    </button>
  );
}
