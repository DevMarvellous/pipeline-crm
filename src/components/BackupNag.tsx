import { useState } from 'react';
import { useSettings, useLeads } from '../lib/store';
import { backupOverdue, downloadExport } from '../lib/backup';
import { DownloadIcon, XIcon } from './Icons';

/** Weekly "export your data" banner. Dismiss lasts for the session. */
export function BackupNag() {
  const [dismissed, setDismissed] = useState(false);
  // Subscribe so the banner disappears right after an export or toggle
  useSettings();
  useLeads();

  if (dismissed || !backupOverdue()) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-warm/30 bg-warm/10 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Time to back up</p>
        <p className="text-xs text-ink-dim">It's been over a week since your last export.</p>
      </div>
      <button
        onClick={downloadExport}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-warm px-3 text-xs font-semibold text-black active:opacity-80"
      >
        <DownloadIcon size={13} /> Export
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss backup reminder"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint active:bg-surface2"
      >
        <XIcon size={15} />
      </button>
    </div>
  );
}
