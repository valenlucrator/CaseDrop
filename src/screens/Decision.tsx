import { useNavigate, useParams } from 'react-router-dom';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { EvidenceChips } from '../components/EvidenceChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Screen, Spacer, StickyFooter } from '../components/Screen';
import type { Side } from '../types/case';

export function Decision() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const c = getCase(caseId);

  if (!c) return <Screen>Case not found.</Screen>;

  const opened = c.evidence.filter((e) => play.selected.includes(e.id));

  const option = (side: Side, label: string) => {
    const chosen = play.choice === side;
    return (
      <button
        type="button"
        onClick={() => playDispatch({ type: 'SET_CHOICE', choice: side })}
        className={`flex items-center justify-between rounded-[16px] border p-[26px_22px] text-left transition-transform duration-100 active:scale-[0.99] ${
          chosen ? 'border-accent bg-surface-2' : 'border-border-strong bg-transparent'
        }`}
      >
        <span className="font-display text-[24px] leading-none font-bold tracking-[-0.015em] uppercase">
          {label}
        </span>
        <span
          className={`h-[11px] w-[11px] shrink-0 rounded-full ${chosen ? 'bg-accent' : 'bg-[#3e444b]'}`}
        />
      </button>
    );
  };

  return (
    <Screen pad="pb-0">
      <MetaLabel className="mb-8">{c.title.toUpperCase()}</MetaLabel>

      <h1 className="font-display text-[40px] leading-[0.98] font-extrabold tracking-[-0.03em] uppercase">
        What would you do?
      </h1>

      <div className="mt-5 text-[15px] leading-[1.5] text-text-secondary">{c.question}</div>

      {/*
        Blueprint §9, screen 4 correction: the mockup showed only the case
        title here. The player is committing irreversibly, so the two items
        they opened have to stay reachable.
      */}
      <div className="mt-7 flex flex-col gap-3">
        <MetaLabel>WHAT YOU OPENED</MetaLabel>
        <EvidenceChips items={opened} />
      </div>

      <Spacer />

      <StickyFooter>
        <div className="mb-5 flex flex-col gap-3">
          {option('a', c.options.a)}
          {option('b', c.options.b)}
        </div>

        <div className="mb-4 text-center text-[12.5px] leading-[1.4] text-text-muted">
          Your decision cannot be changed after submission.
        </div>

        <PrimaryButton
          disabled={play.choice === null}
          onClick={() => navigate(`/play/${c.id}/argument`)}
          className="h-[60px]"
        >
          {play.choice === null ? 'CHOOSE A SIDE' : 'LOCK IT IN'}
        </PrimaryButton>
      </StickyFooter>
    </Screen>
  );
}
