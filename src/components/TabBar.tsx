import { NavLink } from 'react-router-dom';
import { usePlayer } from '../state/PlayerContext';
import { pendingResults } from '../state/reducer';
import { useFeature } from '../config/features';

interface Tab {
  to: string;
  label: string;
  icon: (c: string) => React.ReactNode;
}

const HOME: Tab = {
  to: '/',
  label: 'Home',
  icon: (c) => <rect x="2.5" y="2.5" width="15" height="15" rx="4.5" fill="none" stroke={c} strokeWidth="1.6" />,
};

const JURY: Tab = {
  to: '/jury',
  label: 'Jury',
  icon: (c) => (
    <>
      <rect x="2.4" y="4" width="6" height="12" rx="1.6" fill="none" stroke={c} strokeWidth="1.6" />
      <rect x="11.6" y="4" width="6" height="12" rx="1.6" fill="none" stroke={c} strokeWidth="1.6" />
    </>
  ),
};

const LEARN: Tab = {
  to: '/learn',
  label: 'Learn',
  icon: (c) => (
    <path
      d="M3 5.5h6a2 2 0 012 2V17a2.2 2.2 0 00-2-1.4H3zM17 5.5h-6a2 2 0 00-2 2V17a2.2 2.2 0 012-1.4h6z"
      fill="none"
      stroke={c}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
};

const COMMUNITY: Tab = {
  to: '/community',
  label: 'Groups',
  icon: (c) => (
    <>
      <circle cx="7" cy="8" r="2.6" fill="none" stroke={c} strokeWidth="1.5" />
      <circle cx="13.6" cy="8" r="2.6" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M2.6 16c0-2.2 2-3.6 4.4-3.6s4.4 1.4 4.4 3.6" fill="none" stroke={c} strokeWidth="1.5" />
    </>
  ),
};

const PROFILE: Tab = {
  to: '/profile',
  label: 'Profile',
  icon: (c) => <circle cx="10" cy="10" r="7.3" fill="none" stroke={c} strokeWidth="1.6" />,
};

/**
 * Three tabs in v1. Learn and Groups appear only behind their flags — a tab
 * that opens to an empty state is worse than a tab that is not there, and it
 * teaches the player the app is thin.
 */
export function TabBar() {
  const { state } = usePlayer();
  const learn = useFeature('learn');
  const community = useFeature('community');
  const badge = pendingResults(state).length;

  const tabs = [HOME, JURY, ...(learn ? [LEARN] : []), ...(community ? [COMMUNITY] : []), PROFILE];

  return (
    <nav className="safe-bottom flex shrink-0 items-start justify-between gap-1 border-t border-border bg-surface-0 px-6 pt-3.5 pb-4">
      {tabs.map((tab) => (
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
                    <span className="pulse-dot absolute -top-0.5 -right-1 h-[7px] w-[7px] rounded-full bg-accent" />
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
