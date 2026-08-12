import { useNavigate, useParams } from 'react-router-dom';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { EvidenceRow } from '../components/EvidenceRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen, StickyFooter, Title } from '../components/Screen';

export function Evidence() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const c = getCase(caseId);

  if (!c) return <Screen>Case not found.</Screen>;

  const remaining = c.selectCount - play.selected.length;
  const done = remaining === 0;

  return (
    <Screen pad="pb-0" className="gap-[22px]">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-[9px]">
          <Title>Evidence</Title>
          <div className="text-[13.5px] leading-none text-text-secondary">
            Choose {c.selectCount} of {c.evidence.length}. The rest stay sealed.
          </div>
        </div>
        <div className={`font-mono text-[13px] leading-none ${done ? 'text-text-muted' : 'text-accent'}`}>
          {done ? 'ready' : `${remaining} left`}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {c.evidence.map((item) => (
          <EvidenceRow
            key={item.id}
            item={item}
            selected={play.selected.includes(item.id)}
            onToggle={() =>
              playDispatch({ type: 'TOGGLE_EVIDENCE', id: item.id, max: c.selectCount })
            }
          />
        ))}
      </div>

      <StickyFooter>
        <PrimaryButton disabled={!done} onClick={() => navigate(`/play/${c.id}/decision`)}>
          CONTINUE
        </PrimaryButton>
      </StickyFooter>
    </Screen>
  );
}
