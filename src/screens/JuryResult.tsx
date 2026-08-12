import { juryPairSplit, type JuryPair } from '../engine/pairing';
import { isEarly } from '../engine/population';
import { PlayerCount } from '../components/PlayerCount';
import { PrimaryButton } from '../components/PrimaryButton';
import { SplitBar } from '../components/SplitBar';
import { MetaLabel, Screen, Spacer } from '../components/Screen';

interface Props {
  pair: JuryPair;
  voted: 'a' | 'b';
  onNext: () => void;
}

export function JuryResult({ pair, voted, onNext }: Props) {
  const split = juryPairSplit(pair);
  const yours = voted === 'a' ? split.a : split.b;
  const diverged = yours < 50;

  return (
    <Screen className="gap-[30px]">
      <div className="flex flex-col gap-3">
        <MetaLabel>YOU VOTED</MetaLabel>
        <div className="font-display text-[36px] leading-none font-extrabold tracking-[-0.03em] uppercase">
          Argument {voted.toUpperCase()}
        </div>
        <div className={`text-[16px] leading-none font-medium ${diverged ? 'text-diverge' : 'text-win'}`}>
          {isEarly(split.jurors)
            ? diverged
              ? 'The room went the other way.'
              : 'The room agreed with you.'
            : `${yours}% agreed with you.`}
        </div>
      </div>

      <div className="flex flex-col gap-5 border-t border-border pt-7">
        <SplitBar
          label="Argument A"
          percent={split.a}
          size="sm"
          tone={voted === 'a' ? 'win' : 'neutral'}
          mine={voted === 'a'}
        />
        <SplitBar
          label="Argument B"
          percent={split.b}
          size="sm"
          tone={voted === 'b' ? 'win' : 'neutral'}
          mine={voted === 'b'}
        />
        <PlayerCount count={split.jurors} noun="jurors voted" />
      </div>

      {/*
        Amber is divergence from consensus, and only that. In v1 there is no
        rank population, so the callout says what is actually true rather
        than inventing "61% of Partner-ranked players".
      */}
      {diverged && (
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-diverge/28 bg-surface-1 p-5">
          <div className="meta text-diverge">YOU DIVERGED</div>
          <div className="text-[15.5px] leading-[1.45] text-text-body">
            The jury preferred the other argument. Worth re-reading it to see what it did that
            yours did not.
          </div>
        </div>
      )}

      <Spacer />

      <div className="pb-1.5">
        <PrimaryButton variant="secondary" onClick={onNext}>
          NEXT PAIR
        </PrimaryButton>
      </div>
    </Screen>
  );
}
