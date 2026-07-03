// Thin reactive layer over db.ts. Components read via these hooks and write
// via db directly; db notifies subscribers after every write.

import { useSyncExternalStore } from 'react';
import type { Lead, Settings } from '../types';
import { db } from './db';

const subscribe = (cb: () => void) => db.subscribe(cb);

export function useLeads(): Lead[] {
  // db returns a stable array reference between writes, so this is snapshot-safe
  return useSyncExternalStore(subscribe, () => db.getAllLeads());
}

export function useLead(id: string | undefined): Lead | null {
  return useSyncExternalStore(subscribe, () => (id ? db.getLead(id) : null));
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => db.getSettings());
}
