type Cue = 'lock' | 'reveal' | 'win' | 'loss';

let enabled = false; // default off
let ctx: AudioContext | null = null;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  // iOS suspends the context until a gesture resumes it.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One oscillator, one gain envelope. Four cues do not justify a library. */
function tone(freq: number, durationMs: number, type: OscillatorType, gain = 0.05, slideTo?: number) {
  const ac = context();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const now = ac.currentTime;
  const dur = durationMs / 1000;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, now + dur);

  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(amp).connect(ac.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function sound(cue: Cue) {
  if (!enabled) return;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  switch (cue) {
    case 'lock':
      tone(140, 90, 'square', 0.04);
      break;
    case 'reveal':
      tone(320, 420, 'sine', 0.035, 520);
      break;
    case 'win':
      tone(523, 120, 'triangle', 0.05);
      setTimeout(() => tone(784, 180, 'triangle', 0.045), 110);
      break;
    case 'loss':
      tone(300, 150, 'triangle', 0.045);
      setTimeout(() => tone(220, 220, 'triangle', 0.04), 130);
      break;
  }
}
