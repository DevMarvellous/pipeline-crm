// Framework-agnostic Gemini call. Imported by both the Vercel function
// (api/generate-script.ts) and the Vite dev/preview middleware, so the exact
// same prompt + error mapping runs locally and in production.
//
// Returns a small, sanitized contract — never leaks raw Gemini internals.

export type ErrorCode = 'not_configured' | 'bad_request' | 'rate_limit' | 'gemini_down' | 'timeout';

export type Tone = 'first' | 'followup' | 'viewing' | 'reengage';

export interface LeadContext {
  name: string;
  propertyType?: string;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  status?: string;
  temperature?: string;
  interactions?: { date: string; note: string }[];
}

export interface GeneratePayload {
  tone: Tone;
  lead: LeadContext;
}

export interface GenerateResult {
  status: number;
  message?: string;
  error?: ErrorCode;
}

interface Options {
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const TONE_BRIEF: Record<Tone, string> = {
  first: 'This is the very first outreach — you have not spoken before. Introduce yourself briefly and open a conversation.',
  followup: 'This is a follow-up to an earlier conversation. Reference that you spoke before and gently move things forward.',
  viewing: 'This is right after the lead viewed a property. Thank them for their time and ask for their honest thoughts / next step.',
  reengage: 'This lead has gone cold. Re-engage warmly and low-pressure, giving them an easy reason to reply.',
};

const VALID_TONES: Tone[] = ['first', 'followup', 'viewing', 'reengage'];

function naira(n?: number): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `₦${Math.round((n / 1_000_000) * 10) / 10}m`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n}`;
}

function budgetLine(lead: LeadContext): string | null {
  const lo = naira(lead.budgetMin);
  const hi = naira(lead.budgetMax);
  if (lo && hi) return `${lo}–${hi}`;
  if (hi) return `up to ${hi}`;
  if (lo) return `from ${lo}`;
  return null;
}

/** Validate the payload shape. Returns an error code or null. */
export function validatePayload(body: unknown): { payload?: GeneratePayload; error?: ErrorCode } {
  if (!body || typeof body !== 'object') return { error: 'bad_request' };
  const b = body as Record<string, unknown>;
  if (!VALID_TONES.includes(b.tone as Tone)) return { error: 'bad_request' };
  const lead = b.lead as Record<string, unknown> | undefined;
  if (!lead || typeof lead.name !== 'string' || lead.name.trim() === '') return { error: 'bad_request' };
  const interactions = Array.isArray(lead.interactions)
    ? (lead.interactions as unknown[])
        .filter((i): i is { date: string; note: string } =>
          !!i && typeof (i as { note?: unknown }).note === 'string'
        )
        .slice(0, 3)
    : [];
  return {
    payload: {
      tone: b.tone as Tone,
      lead: {
        name: lead.name.trim(),
        propertyType: typeof lead.propertyType === 'string' ? lead.propertyType : undefined,
        budgetMin: typeof lead.budgetMin === 'number' ? lead.budgetMin : undefined,
        budgetMax: typeof lead.budgetMax === 'number' ? lead.budgetMax : undefined,
        location: typeof lead.location === 'string' ? lead.location : undefined,
        status: typeof lead.status === 'string' ? lead.status : undefined,
        temperature: typeof lead.temperature === 'string' ? lead.temperature : undefined,
        interactions,
      },
    },
  };
}

function buildSystemInstruction(): string {
  return [
    'You are a solo real estate agent in Nigeria writing a short outreach message to a lead over WhatsApp.',
    'Write in warm, professional English that is friendly and human — not stiff or corporate, not slangy.',
    'Use the lead\'s first name naturally. Keep it under 60 words.',
    'Output ONLY the message text itself. No preamble, no sign-off block, no quotation marks,',
    'no "Here is a message" framing, no subject line, no options — just the message ready to send.',
  ].join(' ');
}

function buildUserPrompt(payload: GeneratePayload): string {
  const { tone, lead } = payload;
  const lines: string[] = [`Message purpose: ${TONE_BRIEF[tone]}`, '', 'Lead details:', `- Name: ${lead.name}`];
  if (lead.propertyType) lines.push(`- Looking for: ${lead.propertyType}`);
  if (lead.location) lines.push(`- Location/axis: ${lead.location}`);
  const budget = budgetLine(lead);
  if (budget) lines.push(`- Budget: ${budget}`);
  if (lead.status) lines.push(`- Pipeline status: ${lead.status}`);
  if (lead.temperature) lines.push(`- Interest level: ${lead.temperature}`);
  if (lead.interactions && lead.interactions.length > 0) {
    lines.push('- Recent interactions (most recent first):');
    for (const i of lead.interactions) {
      const day = i.date ? i.date.slice(0, 10) : '';
      lines.push(`   • ${day ? day + ': ' : ''}${i.note}`);
    }
  }
  lines.push('', 'Write the message now.');
  return lines.join('\n');
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export async function generateScript(
  body: unknown,
  apiKey: string | undefined,
  options: Options = {}
): Promise<GenerateResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { status: 500, error: 'not_configured' };
  }

  const { payload, error } = validatePayload(body);
  if (error || !payload) return { status: 400, error: error ?? 'bad_request' };

  const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const baseUrl = (options.baseUrl || process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 15_000;

  const url = `${baseUrl}/v1beta/models/${model}:generateContent`;
  const requestBody = {
    systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPrompt(payload) }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      return { status: 504, error: 'timeout' };
    }
    console.error('[generate-script] network error calling Gemini:', err);
    return { status: 502, error: 'gemini_down' };
  }
  clearTimeout(timer);

  if (!res.ok) {
    // Log the real upstream body server-side for debugging; never return it.
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    console.error(`[generate-script] Gemini responded ${res.status}: ${detail.slice(0, 500)}`);
    if (res.status === 400) return { status: 400, error: 'bad_request' };
    if (res.status === 401 || res.status === 403) return { status: 500, error: 'not_configured' };
    if (res.status === 429) return { status: 429, error: 'rate_limit' };
    if (res.status >= 500) return { status: 502, error: 'gemini_down' };
    return { status: 502, error: 'gemini_down' };
  }

  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch (err) {
    console.error('[generate-script] failed to parse Gemini JSON:', err);
    return { status: 502, error: 'gemini_down' };
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) {
    // Blocked by safety filter or empty completion — treat as retryable bad request.
    console.error('[generate-script] empty candidate. blockReason=', data.promptFeedback?.blockReason);
    return { status: 422, error: 'bad_request' };
  }

  // Strip stray wrapping quotes the model sometimes adds despite instructions.
  const cleaned = text.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  return { status: 200, message: cleaned };
}
