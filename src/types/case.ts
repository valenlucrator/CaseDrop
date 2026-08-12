export type Posture = 'lean_a' | 'lean_b' | 'genuinely_split';

export type Side = 'a' | 'b';

export interface EvidenceItem {
  id: string; // 'A' | 'B' | ...
  label: string; // 'SECURITY LOG'
  teaser: string; // shown before selection — must NOT reveal the payload
  body: string; // revealed only if selected
  favors: Side | 'neutral';
  /**
   * No item is weight 3. Decisiveness must come from a combination —
   * otherwise choose-2 becomes a lottery. See blueprint §6.1.
   */
  weight: 1 | 2;
  /** Terms the argument can cite to prove the item was actually used. */
  keyTerms: string[];
}

export interface Benchmark {
  posture: Posture;
  favored: Side | null;
  confidence: 'low' | 'moderate' | 'high';
  centralIssue: string;
  /** Key terms of the central issue — scoring looks for engagement with these. */
  centralTerms: string[];
  forA: string[];
  forB: string[];
  reasoning: string; // shown post-result
}

export interface Case {
  id: string; // '001'
  slug: string;
  title: string; // 'THE SECOND REFUND'
  tags: string[];
  /**
   * Learn entry ids this case turns on. Without this link Learn is a
   * glossary, which is strictly worse than a search engine.
   */
  concepts: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  jurisdictionRule: string; // self-contained legal rule
  scenario: string; // ~150–250 words
  question: string;
  options: { a: string; b: string };
  evidence: EvidenceItem[]; // exactly 5
  selectCount: 2;
  benchmark: Benchmark;
  simulatedSplit: { a: number }; // 0–100, used until real data exists
}
