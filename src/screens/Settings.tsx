import { useRef, useState, useSyncExternalStore } from 'react';
import { canInstall, onInstallabilityChange, promptInstall } from '../lib/install';
import type { ThemePref } from '../types';
import { db } from '../lib/db';
import { useSettings } from '../lib/store';
import { downloadExport, readFileAsText } from '../lib/backup';
import { notificationsSupported, requestPermission } from '../lib/notifications';
import { formatDateTime } from '../lib/dates';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BellIcon, DownloadIcon, MoonIcon, SunIcon, UploadIcon } from '../components/Icons';

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-14 items-center justify-between gap-3 bg-surface px-4 py-3">{children}</div>;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface2 border border-line'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'left-1 translate-x-5' : 'left-1'}`}
      />
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="overline-label mb-1.5 px-1">{title}</h2>
      <div className="space-y-px overflow-hidden rounded-xl border border-line">{children}</div>
    </section>
  );
}

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Settings() {
  const settings = useSettings();
  const installable = useSyncExternalStore(onInstallabilityChange, canInstall);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(0); // 0 → 1 → 2 (double confirm)

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setImportResult(null);
    try {
      setPendingImport(await readFileAsText(file));
    } catch {
      setImportResult('Could not read that file.');
    }
  }

  function runImport(mode: 'merge' | 'replace') {
    if (!pendingImport) return;
    try {
      const { added, updated } = db.importAll(pendingImport, mode);
      setImportResult(`Imported: ${added} added, ${updated} updated.`);
    } catch {
      setImportResult("That file doesn't look like a Pipeline backup.");
    }
    setPendingImport(null);
  }

  async function toggleNotifications(on: boolean) {
    if (!on) {
      db.updateSettings({ notificationsEnabled: false });
      return;
    }
    const granted = await requestPermission();
    if (!granted) db.updateSettings({ notificationsEnabled: false });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      <Group title="Appearance">
        <Row>
          <div className="flex items-center gap-3">
            {settings.theme === 'light' ? <SunIcon size={18} className="text-ink-dim" /> : <MoonIcon size={18} className="text-ink-dim" />}
            <span className="text-[15px]">Theme</span>
          </div>
          <div className="flex rounded-lg border border-line bg-bg p-0.5 text-[13px] font-medium">
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => db.updateSettings({ theme: o.value })}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  settings.theme === o.value ? 'bg-surface2 text-ink' : 'text-ink-faint'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Row>
      </Group>

      <Group title="Backup">
        <Row>
          <div>
            <span className="text-[15px]">Export data</span>
            <p className="text-xs text-ink-faint">
              {settings.lastExportAt ? `Last export ${formatDateTime(settings.lastExportAt)}` : 'Never exported'}
            </p>
          </div>
          <button
            onClick={downloadExport}
            className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-accent-ink active:opacity-80"
          >
            <DownloadIcon size={15} /> Export
          </button>
        </Row>
        <Row>
          <div>
            <span className="text-[15px]">Import from backup</span>
            <p className="text-xs text-ink-faint">Restores a Pipeline JSON export</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface2 px-4 text-[13px] font-medium active:opacity-70"
          >
            <UploadIcon size={15} /> Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void onFilePicked(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Row>
        <Row>
          <div>
            <span className="text-[15px]">Weekly backup reminder</span>
            <p className="text-xs text-ink-faint">Nags you to export every 7 days</p>
          </div>
          <Toggle on={settings.backupReminder} onChange={(v) => db.updateSettings({ backupReminder: v })} label="Weekly backup reminder" />
        </Row>
        {importResult && <p className="bg-surface px-4 py-3 text-[13px] text-ink-dim">{importResult}</p>}
      </Group>

      <Group title="Notifications">
        <Row>
          <div className="flex items-center gap-3">
            <BellIcon size={18} className="text-ink-dim" />
            <div>
              <span className="text-[15px]">Follow-up reminders</span>
              <p className="text-xs text-ink-faint">
                {notificationsSupported() ? 'Notifies you when follow-ups are due' : 'Not supported in this browser'}
              </p>
            </div>
          </div>
          {notificationsSupported() && (
            <Toggle on={settings.notificationsEnabled} onChange={(v) => void toggleNotifications(v)} label="Follow-up reminders" />
          )}
        </Row>
      </Group>

      {installable && (
        <Group title="App">
          <Row>
            <div>
              <span className="text-[15px]">Install Pipeline</span>
              <p className="text-xs text-ink-faint">Add to your home screen for one-tap access</p>
            </div>
            <button
              onClick={() => void promptInstall()}
              className="h-10 rounded-xl bg-accent px-4 text-[13px] font-semibold text-accent-ink active:opacity-80"
            >
              Install
            </button>
          </Row>
        </Group>
      )}

      {import.meta.env.DEV && (
        <Group title="Developer">
          <Row>
            <div>
              <span className="text-[15px]">Load demo leads</span>
              <p className="text-xs text-ink-faint">Adds 20 fake leads for testing (dev only)</p>
            </div>
            <button
              onClick={() => {
                void import('../lib/seed').then((m) => m.seed());
              }}
              className="h-10 rounded-xl border border-line bg-surface2 px-4 text-[13px] font-medium active:opacity-70"
            >
              Seed
            </button>
          </Row>
        </Group>
      )}

      <Group title="Danger zone">
        <Row>
          <div>
            <span className="text-[15px] text-danger">Clear all data</span>
            <p className="text-xs text-ink-faint">Deletes every lead. Export first.</p>
          </div>
          <button
            onClick={() => setConfirmClear(1)}
            className="h-10 rounded-xl border border-danger/30 px-4 text-[13px] font-semibold text-danger active:bg-danger/10"
          >
            Clear
          </button>
        </Row>
      </Group>

      {/* Import mode chooser */}
      {pendingImport !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setPendingImport(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Import backup"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">Import backup</h2>
            <p className="mt-1.5 text-sm text-ink-dim">
              Merge keeps your current leads and adds or updates from the file. Replace deletes everything first.
            </p>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => runImport('merge')}
                className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-ink active:opacity-80"
              >
                Merge into current data
              </button>
              <button
                onClick={() => runImport('replace')}
                className="h-11 w-full rounded-xl border border-danger/30 text-sm font-semibold text-danger active:bg-danger/10"
              >
                Replace everything
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="h-11 w-full rounded-xl border border-line bg-surface2 text-sm font-medium active:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double-confirm clear */}
      <ConfirmDialog
        open={confirmClear === 1}
        title="Clear all data?"
        message="This deletes every lead and interaction on this device."
        confirmLabel="Continue"
        danger
        onCancel={() => setConfirmClear(0)}
        onConfirm={() => setConfirmClear(2)}
      />
      <ConfirmDialog
        open={confirmClear === 2}
        title="Are you absolutely sure?"
        message="Last chance. There is no undo and no cloud copy."
        confirmLabel="Delete everything"
        danger
        onCancel={() => setConfirmClear(0)}
        onConfirm={() => {
          db.clearAll();
          setConfirmClear(0);
        }}
      />
    </div>
  );
}
