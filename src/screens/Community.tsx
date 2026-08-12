import { useState } from 'react';
import { caseForDate } from '../data/cases';
import { communitySplit } from '../engine/pairing';
import { usePlayer } from '../state/PlayerContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { SplitBar } from '../components/SplitBar';
import { MetaLabel, Screen, Title } from '../components/Screen';

export const GROUP_MEMBER_CAP = 200;

/**
 * v2 Community means "see how my people voted" and nothing else.
 *
 * Deliberately absent: free-text posting, threads, DMs, reactions,
 * moderation, notifications, group-vs-group events. Each of those is a
 * product, and shipping one turns this into the thing that killed Juriscope.
 */
export function Community() {
  const { state } = usePlayer();
  const [code, setCode] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const today = caseForDate();
  const split = communitySplit(today);

  if (!group) {
    return (
      <Screen className="gap-5">
        <Title>Groups</Title>
        <div className="text-[14px] leading-[1.5] text-text-secondary">
          Join with an invite code. There is no directory and no discovery feed — a group is
          people you already know.
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="INVITE CODE"
          maxLength={8}
          className="w-full rounded-[12px] border border-border-strong bg-surface-1 px-4 py-3 text-center font-mono text-[18px] tracking-[0.2em] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <PrimaryButton disabled={code.length < 4} onClick={() => setGroup(code)}>
          JOIN GROUP
        </PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen className="gap-6">
      <div className="flex flex-col gap-2">
        <MetaLabel>Group</MetaLabel>
        <Title className="text-[26px]">{group}</Title>
      </div>

      <div className="flex flex-col gap-[26px] border-t border-border pt-6">
        <MetaLabel>Today · {today.title}</MetaLabel>
        <SplitBar label={today.options.a} percent={split.a} mine />
        <SplitBar label={today.options.b} percent={split.b} />
        <div className="font-mono text-[12.5px] text-text-muted">
          {state.casesCompleted > 0 ? 'Including yours' : 'You have not played today'}
        </div>
      </div>
    </Screen>
  );
}
