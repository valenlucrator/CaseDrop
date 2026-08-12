import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Screen, Spacer, StickyFooter } from '../components/Screen';

export function CaseIntro() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { playDispatch } = usePlay();
  const c = getCase(caseId);

  useEffect(() => {
    if (c) playDispatch({ type: 'BEGIN', caseId: c.id });
  }, [c, playDispatch]);

  if (!c) return <Screen>Case not found.</Screen>;

  return (
    <Screen pad="pb-0">
      <div className="mb-[46px] flex items-center justify-between">
        <button type="button" onClick={() => navigate('/')} aria-label="Close" className="text-text-muted">
          <X size={18} strokeWidth={1.6} />
        </button>
        <MetaLabel>CASE {c.id}</MetaLabel>
      </div>

      <h1 className="font-display text-[52px] leading-[0.94] font-extrabold tracking-[-0.03em] uppercase">
        {c.title}
      </h1>

      <div className="mt-[34px] mb-[30px] flex gap-[26px]">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[10.5px] leading-none text-text-muted">DIFFICULTY</div>
          <div className="font-mono text-[13px] leading-none tracking-[0.18em]">
            {'★'.repeat(c.difficulty)}
            <span className="text-[#4b5158]">{'☆'.repeat(5 - c.difficulty)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-[7px]">
          <div className="text-[10.5px] leading-none text-text-muted">LENGTH</div>
          <div className="font-mono text-[13px] leading-none">{c.estimatedMinutes} min</div>
        </div>
      </div>

      <div className="mb-[34px] flex flex-wrap gap-2">
        {c.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-lg border border-border-strong px-3 py-[7px] text-[11.5px] leading-none font-medium text-[#a8aeb6]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="border-b border-border pb-[30px] text-[17px] leading-[1.55] text-pretty whitespace-pre-line text-text-body">
        {c.scenario}
      </div>

      <div className="flex flex-col gap-2.5 border-b border-border py-[26px]">
        <MetaLabel>THE RULE</MetaLabel>
        <div className="text-[14.5px] leading-[1.5] text-pretty text-text-secondary">
          {c.jurisdictionRule}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-[26px]">
        <MetaLabel>YOUR TASK</MetaLabel>
        <div className="font-display text-[22px] leading-[1.3] font-semibold tracking-[-0.015em]">
          {c.question}
        </div>
      </div>

      <Spacer />

      <StickyFooter>
        <PrimaryButton onClick={() => navigate(`/play/${c.id}/evidence`)}>BEGIN</PrimaryButton>
      </StickyFooter>
    </Screen>
  );
}
