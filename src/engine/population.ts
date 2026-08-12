/**
 * The cold-start gate. Every count in the mockups (4,821 players today,
 * 147 jurors voted) reads as 11, 3 and 11 in week one. Below the threshold
 * we show "You're early" rather than announcing that the app is empty.
 *
 * Blueprint §8. Designed in now precisely so it never has to be retrofitted.
 */
export const POPULATION_THRESHOLD = 50;

/** Live pairing against real players. Flip when a case has real submissions. */
export const LIVE_PAIRING = false;

export function isEarly(count: number): boolean {
  return count < POPULATION_THRESHOLD;
}

export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}
