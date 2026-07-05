// Client wrapper around POST /api/generate-script.
// The key lives server-side; this file only knows the same-origin route.

import type { Lead } from '../types';

export type Tone = 'first' | 'followup' | 'viewing' | 'reengage';

export type ScriptError = 'offline' | 'not_configured' | 'bad_request' | 'rate_limit' | 'gemini_down' | 'timeout';

export const TONES: { value: Tone; label: string; hint: string }[] = [
  { value: 'first', label: 'First outreach', hint: 'Introduce yourself' },
  { value: 'followup', label: 'Follow-up', hint: 'Nudge an earlier chat' },
  { value: 'viewing', label: 'After viewing', hint: 'Get their thoughts' },
  { value: 'reengage', label: 'Re-engage cold', hint: 'Warm them back up' },
];

// User-facing copy per failure. `offline` and `not_configured` are not
// transient — the copy avoids implying a plain retry will fix them.
export const errorCopy: Record<ScriptError, string> = {
  offline: "You're offline — script generation needs internet. Your leads and quick actions still work fine offline.",
  not_configured: "AI script generation isn't configured correctly. Contact the developer.",
  bad_request: "Couldn't generate a script — try again, or edit the lead's details and retry.",
  rate_limit: 'Too many requests right now — wait a moment and try again.',
  gemini_down: "Gemini's service is having issues — try again in a moment.",
  timeout: 'That took too long — try again.',
};

export type ScriptResult = { ok: true; message: string } | { ok: false; error: ScriptError };

const VALID_ERRORS: ScriptError[] = ['not_configured', 'bad_request', 'rate_limit', 'gemini_down', 'timeout'];

/** Only the context Gemini needs — never phone or email. */
function leadContext(lead: Lead) {
  return {
    name: lead.name,
    propertyType: lead.propertyType,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    location: lead.location,
    status: lead.status,
    temperature: lead.temperature,
    interactions: lead.interactions.slice(0, 3).map((i) => ({ date: i.date, note: i.note })),
  };
}

export async function generateScript(lead: Lead, tone: Tone): Promise<ScriptResult> {
  // Detect offline up front — never fire a request that will just hang.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: 'offline' };
  }

  // Client-side ceiling slightly above the server's 15s so a stalled function
  // still resolves the UI instead of spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone, lead: leadContext(lead) }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    // fetch rejects with TypeError when the network is unreachable.
    return { ok: false, error: 'offline' };
  }
  clearTimeout(timer);

  let data: { message?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'gemini_down' };
  }

  if (res.ok && data.message) {
    return { ok: true, message: data.message };
  }
  const code = VALID_ERRORS.includes(data.error as ScriptError) ? (data.error as ScriptError) : 'gemini_down';
  return { ok: false, error: code };
}
