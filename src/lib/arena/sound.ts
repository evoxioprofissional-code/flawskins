// Efeitos sonoros sintetizados via WebAudio (sem arquivos de áudio).
// Criados sob demanda — o AudioContext só acorda após um gesto do usuário.

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}
export function resumeAudio() {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
}

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  delay?: number;
};

function play({ freq, dur, type = "sine", vol = 0.18, slideTo, delay = 0 }: Tone) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  hit() {
    play({ freq: 760, dur: 0.07, type: "triangle", vol: 0.16, slideTo: 1180 });
  },
  head() {
    play({ freq: 1000, dur: 0.05, type: "square", vol: 0.12 });
    play({ freq: 1500, dur: 0.12, type: "triangle", vol: 0.2, slideTo: 2100, delay: 0.02 });
  },
  miss() {
    play({ freq: 180, dur: 0.14, type: "sawtooth", vol: 0.12, slideTo: 90 });
  },
  tick() {
    play({ freq: 520, dur: 0.03, type: "sine", vol: 0.06 });
  },
  record() {
    [660, 880, 1175, 1568].forEach((f, i) =>
      play({ freq: f, dur: 0.16, type: "triangle", vol: 0.18, slideTo: f * 1.05, delay: i * 0.09 })
    );
  },
  start() {
    play({ freq: 420, dur: 0.12, type: "sine", vol: 0.14, slideTo: 660 });
  },
  end() {
    play({ freq: 520, dur: 0.18, type: "triangle", vol: 0.14, slideTo: 300 });
  },
};
