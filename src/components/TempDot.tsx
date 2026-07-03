import type { Temperature } from '../types';

const COLOR: Record<Temperature, string> = {
  hot: 'bg-hot',
  warm: 'bg-warm',
  cold: 'bg-cold',
};

export function TempDot({ temp, className = '' }: { temp: Temperature; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLOR[temp]} ${className}`}
      title={temp}
      aria-label={`${temp} lead`}
    />
  );
}
