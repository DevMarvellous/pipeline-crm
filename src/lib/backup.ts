import { db } from './db';
import { todayString } from './dates';

/** Trigger a JSON download of all data and record the export time. */
export function downloadExport(): void {
  const json = db.exportAll();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipeline-backup-${todayString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  db.updateSettings({ lastExportAt: new Date().toISOString() });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** True when the weekly backup nag should show. */
export function backupOverdue(): boolean {
  const { backupReminder, lastExportAt } = db.getSettings();
  if (!backupReminder) return false;
  const leads = db.getAllLeads();
  if (leads.length === 0) return false;
  if (!lastExportAt) {
    // Never exported: nag once the data itself is a week old
    const oldest = leads.reduce((min, l) => (l.createdAt < min ? l.createdAt : min), leads[0].createdAt);
    return Date.now() - new Date(oldest).getTime() > WEEK_MS;
  }
  return Date.now() - new Date(lastExportAt).getTime() > WEEK_MS;
}
