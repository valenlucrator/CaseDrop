import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { PlayerProvider, usePlayer } from './state/PlayerContext';
import { PlayProvider } from './state/PlayContext';
import { PopulationContext, useFeature } from './config/features';
import { EMPTY_POPULATION, type PopulationStats } from './engine/population';
import { setHapticsEnabled } from './lib/haptics';
import { setSoundEnabled } from './lib/sound';
import { TabBar } from './components/TabBar';
import { RouteTransition, TAB_ROUTES } from './components/motion/RouteTransition';
import { Home } from './screens/Home';
import { CaseIntro } from './screens/CaseIntro';
import { Evidence } from './screens/Evidence';
import { Decision } from './screens/Decision';
import { Argument } from './screens/Argument';
import { CommunityReveal } from './screens/CommunityReveal';
import { Jury } from './screens/Jury';
import { PersonalResult } from './screens/PersonalResult';
import { Profile } from './screens/Profile';
import { Learn } from './screens/Learn';
import { Community } from './screens/Community';

/** Settings own the module-level toggles in lib/. One place, one effect. */
function SettingsBridge() {
  const { state } = usePlayer();
  useEffect(() => setHapticsEnabled(state.settings.haptics), [state.settings.haptics]);
  useEffect(() => setSoundEnabled(state.settings.sound), [state.settings.sound]);
  return null;
}

/**
 * The tab bar sits outside RouteTransition on purpose: it is chrome, not
 * content, and crossfading it along with the screen would make tab switches
 * feel like the whole app reloaded. The play flow has no tab bar at all —
 * leaving mid-case should be a decision, not a stray thumb.
 */
function Shell() {
  const location = useLocation();
  const learn = useFeature('learn');
  const community = useFeature('community');
  const showTabs = TAB_ROUTES.includes(location.pathname);

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-surface-0">
      <RouteTransition>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/jury" element={<Jury />} />
          <Route path="/profile" element={<Profile />} />
          {/* Flagged-off routes fall through to the catch-all, so a stale
              deep link lands on Home rather than a blank screen. */}
          {learn && <Route path="/learn" element={<Learn />} />}
          {community && <Route path="/community" element={<Community />} />}

          <Route path="/play/:caseId" element={<CaseIntro />} />
          <Route path="/play/:caseId/evidence" element={<Evidence />} />
          <Route path="/play/:caseId/decision" element={<Decision />} />
          <Route path="/play/:caseId/argument" element={<Argument />} />
          <Route path="/play/:caseId/reveal" element={<CommunityReveal />} />
          <Route path="/result/:caseId" element={<PersonalResult />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </RouteTransition>
      {showTabs && <TabBar />}
    </div>
  );
}

/**
 * Population stats decide whether gated features may turn on at all. With no
 * backend they are zeros, which is the honest answer and keeps every gate
 * shut. When cloudSync lands, this is where the real counts arrive.
 */
function PopulationProvider({ children }: { children: React.ReactNode }) {
  const [stats] = useState<PopulationStats>(EMPTY_POPULATION);
  return <PopulationContext.Provider value={stats}>{children}</PopulationContext.Provider>;
}

export default function App() {
  return (
    <PopulationProvider>
      <PlayerProvider>
        <SettingsBridge />
        <PlayProvider>
          {/* reducedMotion="user" drops transforms and keeps opacity fades. */}
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </MotionConfig>
        </PlayProvider>
      </PlayerProvider>
    </PopulationProvider>
  );
}
