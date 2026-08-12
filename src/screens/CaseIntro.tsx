import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { D, E, riseItem } from '../lib/motion';
import { useFeature } from '../config/features';
import { ConceptChips } from '../components/ConceptChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Rise, Screen, Spacer, Stagger, StickyFooter } from '../components/Screen';

export function CaseIntro() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { playDispatch } = usePlay();
  const learn = useFeature('learn');
  const c = getCase(caseId);

  useEffect(() => {
    if (c) playDispatch({ type: 'BEGIN', caseId: c.id });
  }, [c, playDispatch]);

  if (!c) return <Screen>Case not found.</Screen>;

  const paragraphs = c.scenario.split('\n\n');

  return (
    <Screen pad="pb-0">
      <div className="mb-[46px] flex items-center justify-between">
        <button type="button" onClick={() => navigate('/')} aria-label="Close" className="text-text-muted">
          <X size={18} strokeWidth={1.6} />
        </button>
        <MetaLabel>CASE {c.id}</MetaLabel>
      </div>

      {/*
        The stagger is the point. A wall of text arriving at once is why the
        scenario reads as homework rather than as a case being handed over.
      */}
      <Stagger gap={0.04}>
        <Rise>
          <h1 className="font-display text-[52px] leading-[0.94] font-extrabold tracking-[-0.03em] uppercase">
            {c.title}
          </h1>
        </Rise>

        <Rise>
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
        </Rise>

        <Rise>
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
        </Rise>

        <div className="prose-scenario border-b border-border pb-[30px] text-[17px] text-text-body">
          {paragraphs.map((p, i) => (
            <motion.p key={i} variants={riseItem} className={i > 0 ? 'mt-4' : ''}>
              {p}
            </motion.p>
          ))}
        </div>

        <Rise>
          <div className="flex flex-col gap-2.5 border-b border-border py-[26px]">
            <MetaLabel>THE RULE</MetaLabel>
            <div className="prose-scenario text-[14.5px] text-text-secondary">{c.jurisdictionRule}</div>
            {/* Concepts open in a sheet, never a navigation — leaving a case
                to look something up is how a 3-minute session is abandoned. */}
            {learn && (
              <div className="mt-2">
                <ConceptChips concepts={c.concepts} />
              </div>
            )}
          </div>
        </Rise>

        <Rise>
          <div className="flex flex-col gap-2.5 pt-[26px]">
            <MetaLabel>YOUR TASK</MetaLabel>
            <div className="font-display text-[22px] leading-[1.3] font-semibold tracking-[-0.015em]">
              {c.question}
            </div>
          </div>
        </Rise>
      </Stagger>

      <Spacer />

      <StickyFooter>
        {/* Enters last. A delayed CTA says "read this first." */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: D.base, ease: E.out, delay: 0.12 + paragraphs.length * 0.04 + 0.24 }}
        >
          <PrimaryButton onClick={() => navigate(`/play/${c.id}/evidence`)}>BEGIN</PrimaryButton>
        </motion.div>
      </StickyFooter>
    </Screen>
  );
}
