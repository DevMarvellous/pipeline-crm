// Web Speech API wrapper. Chrome/Android expose it as webkitSpeechRecognition;
// where unsupported the UI hides the mic button entirely.

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getCtor() !== null;
}

export interface Dictation {
  stop(): void;
}

/**
 * Start dictating. `onFinal` receives each finalized utterance; `onEnd` fires
 * when recognition stops (user stop, silence, or error).
 */
export function startDictation(onFinal: (text: string) => void, onEnd: () => void): Dictation | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'en-NG';
  rec.continuous = true;
  rec.interimResults = false;
  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) onFinal(r[0].transcript.trim());
    }
  };
  rec.onend = onEnd;
  rec.onerror = () => rec.stop();
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}
