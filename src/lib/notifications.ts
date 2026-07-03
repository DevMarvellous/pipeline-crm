// Follow-up notifications. True background scheduling (Notification Triggers)
// isn't shipped in browsers, so the strategy is: check on app open and hourly
// while the app runs, notifying at most once per day.

import { db } from './db';
import { todayString } from './dates';

export function notificationsSupported(): boolean {
  return 'Notification' in window;
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const result = await Notification.requestPermission();
  const granted = result === 'granted';
  db.updateSettings({ notificationsEnabled: granted });
  return granted;
}

async function show(title: string, body: string): Promise<void> {
  // Prefer the service worker so the notification opens the app when tapped
  // even if the tab is gone (handler lives in the SW, wired in Phase 4).
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/icons/pwa-192.png',
        badge: '/icons/pwa-192.png',
        tag: 'pipeline-due',
        data: { url: '/today' },
      });
      return;
    }
  } catch {
    // fall through to a plain Notification
  }
  new Notification(title, { body });
}

/** Fire the daily "n follow-ups due" notification if warranted. */
export async function checkAndNotify(): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const settings = db.getSettings();
  if (!settings.notificationsEnabled) return;

  const today = todayString();
  if (settings.lastNotifiedOn === today) return;

  const due = db.getDueFollowUps();
  if (due.length === 0) return;

  const label = due.length === 1 ? '1 follow-up due today' : `${due.length} follow-ups due today`;
  await show('Pipeline', `${label}. Tap to open.`);
  db.updateSettings({ lastNotifiedOn: today });
}

let timer: number | undefined;

/** Call once at startup: checks now, then hourly while the app stays open. */
export function startNotificationLoop(): void {
  void checkAndNotify();
  if (timer === undefined) {
    timer = window.setInterval(() => void checkAndNotify(), 60 * 60 * 1000);
  }
}
