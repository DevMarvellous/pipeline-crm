import { useEffect } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { useThemeSync } from './lib/theme';
import { startNotificationLoop } from './lib/notifications';
import { BackupNag } from './components/BackupNag';
import { ListIcon, PlusIcon, SettingsIcon, TodayIcon } from './components/Icons';
import { Today } from './screens/Today';
import { AllLeads } from './screens/AllLeads';
import { LeadDetail } from './screens/LeadDetail';
import { AddLead } from './screens/AddLead';
import { Settings } from './screens/Settings';

const NAV_ITEMS = [
  { to: '/today', label: 'Today', icon: TodayIcon },
  { to: '/leads', label: 'Leads', icon: ListIcon },
  { to: '/add', label: 'Add', icon: PlusIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Nav() {
  return (
    <>
      {/* Mobile: fixed bottom bar, thumb-reach, ≥44px targets */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-ink-faint active:text-ink-dim'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop: left sidebar */}
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-line bg-surface p-3 md:flex">
        <div className="mb-6 flex items-center gap-2 px-3 pt-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-ink">
            P
          </span>
          <span className="text-sm font-semibold tracking-tight">Pipeline</span>
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-surface2 text-ink' : 'text-ink-dim hover:bg-surface2/60 hover:text-ink'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

/** md+: two-pane list + detail; mobile: separate routes. */
function LeadsPage() {
  const { id } = useParams();
  return (
    <div className="md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start md:gap-8">
      <div className={id ? 'hidden md:block' : ''}>
        <AllLeads />
      </div>
      {id ? (
        <LeadDetail />
      ) : (
        <div className="hidden min-h-64 items-center justify-center rounded-xl border border-dashed border-line text-sm text-ink-faint md:flex">
          Select a lead
        </div>
      )}
    </div>
  );
}

function Fab() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/add') return null;
  return (
    <button
      onClick={() => navigate('/add')}
      aria-label="Add lead"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-black/25 transition-transform active:scale-95 md:bottom-6 md:right-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <PlusIcon size={26} />
    </button>
  );
}

export default function App() {
  useThemeSync();
  useEffect(() => startNotificationLoop(), []);
  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] md:ml-56 md:max-w-4xl md:px-8 md:pb-8">
        <BackupNag />
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadsPage />} />
          <Route path="/add" element={<AddLead />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
      <Fab />
    </div>
  );
}
