import raw from './entries.json';

export interface LearnEntry {
  id: string;
  term: string;
  category: 'Objections' | 'Courtroom terms' | 'Legal concepts' | 'Procedure';
  meaning: string;
  heardAs: string;
  usedWhen: string;
  related: string[];
  practiceTag: string;
}

export const entries = raw as LearnEntry[];

export const CATEGORIES: LearnEntry['category'][] = [
  'Legal concepts',
  'Objections',
  'Procedure',
  'Courtroom terms',
];

export function getEntry(id: string): LearnEntry | undefined {
  return entries.find((e) => e.id === id);
}

/** Client-side substring match over term + meaning. No index, no library. */
export function searchEntries(query: string): LearnEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.term.toLowerCase().includes(q) ||
      e.meaning.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q),
  );
}

/** Hard cap from the brief: an entry must be readable in under a minute. */
export const MEANING_WORD_CAP = 80;

export function validateEntry(e: LearnEntry): string[] {
  const problems: string[] = [];
  const words = e.meaning.trim().split(/\s+/).length;
  if (words > MEANING_WORD_CAP) {
    problems.push(`${e.id}: meaning is ${words} words, cap ${MEANING_WORD_CAP}`);
  }
  for (const r of e.related) {
    if (!raw.some((x) => (x as LearnEntry).id === r)) {
      problems.push(`${e.id}: related entry "${r}" does not exist`);
    }
  }
  return problems;
}
