import { useState } from 'react';
import type { Lead } from '../types';
import { generateScript, errorCopy, TONES, type ScriptError, type Tone } from '../lib/scriptClient';
import { whatsAppLinkWithText } from '../lib/links';
import { CheckIcon, CopyIcon, SparklesIcon, WhatsAppIcon, XIcon } from './Icons';

type View =
  | { step: 'tones' }
  | { step: 'loading'; tone: Tone }
  | { step: 'result'; tone: Tone; text: string }
  | { step: 'error'; tone: Tone; error: ScriptError };

export function ScriptGenerator({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ step: 'tones' });
  const [copied, setCopied] = useState(false);

  function reset() {
    setView({ step: 'tones' });
    setCopied(false);
  }

  function close() {
    setOpen(false);
    // reset after the sheet is dismissed so it reopens fresh
    setTimeout(reset, 150);
  }

  async function run(tone: Tone) {
    setView({ step: 'loading', tone });
    const result = await generateScript(lead, tone);
    if (result.ok) {
      setView({ step: 'result', tone, text: result.message });
    } else {
      setView({ step: 'error', tone, error: result.error });
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 text-sm font-semibold text-accent transition-colors active:bg-accent/20"
      >
        <SparklesIcon size={17} />
        Generate script
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Generate outreach script"
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <SparklesIcon size={17} className="text-accent" />
                {view.step === 'result' ? 'Your message' : 'Generate script'}
              </h2>
              <button
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint active:bg-surface2"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Tone picker */}
            {view.step === 'tones' && (
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => run(t.value)}
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-line bg-bg p-3 text-left transition-colors active:bg-surface2"
                  >
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className="text-xs text-ink-faint">{t.hint}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {view.step === 'loading' && (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent" />
                <p className="text-sm text-ink-dim">Writing your message…</p>
              </div>
            )}

            {/* Result */}
            {view.step === 'result' && (
              <div>
                <textarea
                  value={view.text}
                  onChange={(e) => setView({ ...view, text: e.target.value })}
                  rows={5}
                  className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent/50"
                  aria-label="Generated message (editable)"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => copy(view.text)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface2 text-sm font-medium active:opacity-70"
                  >
                    {copied ? <CheckIcon size={16} className="text-accent" /> : <CopyIcon size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={whatsAppLinkWithText(lead, view.text)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-ink active:opacity-80"
                  >
                    <WhatsAppIcon size={16} />
                    Send
                  </a>
                </div>
                <button
                  onClick={() => run(view.tone)}
                  className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-ink-dim active:bg-surface2"
                >
                  Regenerate
                </button>
              </div>
            )}

            {/* Error — always actionable, never a stuck spinner */}
            {view.step === 'error' && (
              <div className="py-2">
                <p className="rounded-xl bg-surface2 px-4 py-3 text-sm text-ink-dim">{errorCopy[view.error]}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={reset}
                    className="h-11 flex-1 rounded-xl border border-line bg-surface2 text-sm font-medium active:opacity-70"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => run(view.tone)}
                    className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-ink active:opacity-80"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
