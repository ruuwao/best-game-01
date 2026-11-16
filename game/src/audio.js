// All sound is synthesised with WebAudio: no audio files, no network.
// A quiet two-oscillator pad hums under the game; every effect is a short
// oscillator or filtered-noise burst built on demand.

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, freqEnd, duration, type, volume, when = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, volume, filterFreq, when = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    startPad() {
      if (!ensure() || padNodes) return;
      const oscA = context.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = 55;
      const oscB = context.createOscillator();
      oscB.type = 'sine';
      oscB.frequency.value = 82.5;
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(master);
      const gain = context.createGain();
      gain.gain.value = 0.05;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      oscA.start();
      oscB.start();
      lfo.start();
      padNodes = { oscA, oscB, lfo, gain };
    },
    shoot() {
      tone(880, 320, 0.08, 'square', 0.08);
    },
    hit() {
      noise(0.06, 0.12, 2400);
    },
    explode(big = false) {
      noise(big ? 0.55 : 0.3, big ? 0.5 : 0.3, big ? 900 : 1400);
      tone(big ? 160 : 220, 40, big ? 0.5 : 0.25, 'sawtooth', 0.22);
    },
    hurt() {
      tone(140, 60, 0.25, 'sawtooth', 0.25);
      noise(0.15, 0.2, 700);
    },
    pickup() {
      tone(1320, 1760, 0.09, 'sine', 0.1);
    },
    dash() {
      noise(0.18, 0.16, 3200);
    },
    waveHorn() {
      tone(220, 220, 0.35, 'sawtooth', 0.14);
      tone(330, 330, 0.35, 'sawtooth', 0.1, 0.05);
      tone(440, 440, 0.4, 'sawtooth', 0.08, 0.1);
    },
    upgrade() {
      tone(523, 523, 0.12, 'sine', 0.14);
      tone(659, 659, 0.12, 'sine', 0.14, 0.09);
      tone(784, 784, 0.2, 'sine', 0.14, 0.18);
    },
    boss() {
      tone(98, 49, 0.9, 'sawtooth', 0.28);
      tone(147, 73, 0.9, 'sawtooth', 0.18, 0.1);
      noise(0.8, 0.2, 500, 0.05);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, freq, 0.3, 'sine', 0.15, i * 0.13));
    },
    lose() {
      [392, 311, 233, 175].forEach((freq, i) => tone(freq, freq * 0.94, 0.35, 'triangle', 0.16, i * 0.16));
    },
  };
}
