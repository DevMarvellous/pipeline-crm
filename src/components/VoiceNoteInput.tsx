import { useEffect, useRef, useState } from 'react';
import { speechSupported, startDictation, type Dictation } from '../lib/speech';
import { MicIcon, SquareIcon } from './Icons';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}

/** Notes textarea with a dictation button (hidden where speech is unsupported). */
export function VoiceNoteInput({ value, onChange, placeholder, rows = 4, autoFocus }: Props) {
  const [listening, setListening] = useState(false);
  const dictation = useRef<Dictation | null>(null);
  // Keep latest value for the onFinal closure without restarting recognition
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => () => dictation.current?.stop(), []);

  function toggle() {
    if (listening) {
      dictation.current?.stop();
      return;
    }
    const d = startDictation(
      (text) => {
        const cur = valueRef.current;
        onChange(cur ? `${cur.replace(/\s+$/, '')} ${text}` : text);
      },
      () => {
        setListening(false);
        dictation.current = null;
      }
    );
    if (d) {
      dictation.current = d;
      setListening(true);
    }
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-12 text-[15px] outline-none placeholder:text-ink-faint focus:border-accent/50"
      />
      {speechSupported() && (
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? 'Stop dictation' : 'Dictate note'}
          title={listening ? 'Stop dictation' : 'Dictate note'}
          className={`absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            listening ? 'animate-pulse bg-danger text-white' : 'bg-surface2 text-ink-dim active:bg-line'
          }`}
        >
          {listening ? <SquareIcon size={16} /> : <MicIcon size={17} />}
        </button>
      )}
    </div>
  );
}
