import type { EvidenceItem } from '../types/case';

interface Props {
  item: EvidenceItem;
  selected: boolean;
  /** Selection is locked once the player leaves the Evidence screen. */
  locked?: boolean;
  onToggle?: () => void;
}

export function EvidenceRow({ item, selected, locked = false, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      className={`flex flex-col gap-[9px] rounded-[14px] border p-[16px_17px] text-left transition-transform duration-100 ${
        locked ? '' : 'active:scale-[0.99]'
      } ${selected ? 'border-accent bg-surface-2' : 'border-border-strong bg-surface-1'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-[14.5px] font-semibold uppercase tracking-[0.02em]">
          {item.label}
        </div>
        <div
          className={`h-[15px] w-[15px] shrink-0 rounded-[4px] border ${
            selected ? 'border-accent bg-accent' : 'border-border-strong bg-transparent'
          }`}
        />
      </div>

      {/* The teaser never reveals the payload — the choice has to be a real one. */}
      <div className="text-[13px] leading-[1.45] text-text-secondary">{item.teaser}</div>

      {selected && (
        <div className="mt-[5px] border-t border-white/8 pt-3 text-[13.5px] leading-[1.5] whitespace-pre-line text-text-body">
          {item.body}
        </div>
      )}
    </button>
  );
}
