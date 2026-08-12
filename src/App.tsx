import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { PlayerProvider } from './state/PlayerContext';
import { PlayProvider } from './state/PlayContext';
import { TabBar } from './components/TabBar';
import { Home } from './screens/Home';
import { CaseIntro } from './screens/CaseIntro';
import { Evidence } from './screens/Evidence';
import { Decision } from './screens/Decision';
import { Argument } from './screens/Argument';
import { CommunityReveal } from './screens/CommunityReveal';
import { Jury } from './screens/Jury';
import { PersonalResult } from './screens/PersonalResult';
import { Profile } from './screens/Profile';

/** Tabbed surfaces. The play flow deliberately has no tab bar — leaving
 *  mid-case should be a decision, not a stray thumb. */
function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}

function FullScreenLayout() {
  return <Outlet />;
}

export default function App() {
  return (
    <PlayerProvider>
      <PlayProvider>
        <BrowserRouter>
          <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-surface-0">
            <Routes>
              <Route element={<TabLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/jury" element={<Jury />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route element={<FullScreenLayout />}>
                <Route path="/play/:caseId" element={<CaseIntro />} />
                <Route path="/play/:caseId/evidence" element={<Evidence />} />
                <Route path="/play/:caseId/decision" element={<Decision />} />
                <Route path="/play/:caseId/argument" element={<Argument />} />
                <Route path="/play/:caseId/reveal" element={<CommunityReveal />} />
                <Route path="/result/:caseId" element={<PersonalResult />} />
              </Route>

              <Route path="*" element={<Home />} />
            </Routes>
          </div>
        </BrowserRouter>
      </PlayProvider>
    </PlayerProvider>
  );
}
