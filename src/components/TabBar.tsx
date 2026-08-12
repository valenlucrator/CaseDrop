import { NavLink } from 'react-router-dom';
import { usePlayer } from '../state/PlayerContext';
import { pendingResults } from '../state/reducer';

/**
 * Three tabs. Learn, Community and Rank stay out of the nav entirely until
 * a metric demands them — an empty tab teaches players the app is thin.
 */
const TABS = [
  {
    to: '/',
    label: 'Home',
    icon: (c: string) => <rect x="2.5" y="2.5" width="15" height="15" rx="4.5" fill="none" stroke={c} strokeWidth="1.6" />,
  },
  {
    to: '/jury',
    label: 'Jury',
    icon: (c: string) => (
      <>
        <rect x="2.4" y="4" width="6" height="12" rx="1.6" fill="none" stroke={c} strokeWidth="1.6" />
        <rect x="11.6" y="4" width="6" height="12" rx="1.6" fill="none" stroke={c} strokeWidth="1.6" />
      </>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (c: string) => <circle cx="10" cy="10" r="7.3" fill="none" stroke={c} strokeWidth="1.6" />,
  },
];

export function TabBar() {
  const { state } = usePlayer();
  const badge = pendingResults(state).length;

  return (
    <nav className="safe-bottom flex shrink-0 items-start justify-between gap-1 border-t border-border bg-surface-0 px-6 pt-3.5 pb-4">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="flex flex-1 flex-col items-center gap-1.5">
          {({ isActive }) => {
            const color = isActive ? '#ECEDEE' : '#5D646C';
            return (
              <>
                <div className="relative">
                  <svg width="19" height="19" viewBox="0 0 20 20">
                    {tab.icon(color)}
                  </svg>
                  {tab.to === '/' && badge > 0 && (
                    <span className="absolute -top-0.5 -right-1 h-[7px] w-[7px] rounded-full bg-accent" />
                  )}
                </div>
                <div
                  className="text-[9.5px] uppercase tracking-[0.09em] transition-opacity"
                  style={{ color, opacity: isActive ? 1 : 0 }}
                >
                  {tab.label}
                </div>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
