let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gain: number) {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0.0001, audio.currentTime + start);
  vol.gain.exponentialRampToValueAtTime(gain, audio.currentTime + start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(vol).connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.02);
}

/** Short, non-annoying feedback sounds. No audio files → zero extra bytes. */
export function playFeedback(kind: "correct" | "wrong" | "finish") {
  try {
    if (kind === "correct") {
      tone(660, 0, 0.12, 0.05);
      tone(880, 0.09, 0.14, 0.04);
    } else if (kind === "wrong") {
      tone(220, 0, 0.18, 0.05);
    } else {
      tone(523, 0, 0.14, 0.05);
      tone(659, 0.12, 0.14, 0.05);
      tone(784, 0.24, 0.2, 0.05);
    }
  } catch {
    // Audio is a nice-to-have: never break the learning flow.
  }
}
