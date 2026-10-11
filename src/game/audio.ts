export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  tone(f: number, f2: number, dur: number, type: OscillatorType = "sine", vol = 0.4, delay = 0) {
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  noise(dur: number, vol: number, hpFreq: number) {
    if (this.muted || !this.ctx || !this.master) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hpFreq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start();
  }

  jump(p = 0) {
    this.tone(380 + p * 25, 640 + p * 40, 0.11, "sine", 0.22);
  }
  lane(dir: number) {
    this.tone(dir > 0 ? 520 : 480, dir > 0 ? 760 : 700, 0.07, "sine", 0.1);
  }
  slide() {
    this.tone(400, 200, 0.12, "triangle", 0.12);
  }
  bump() {
    this.tone(180, 120, 0.08, "triangle", 0.12);
  }
  heart(combo: number) {
    const notes = [659, 784, 880, 988, 1175, 1319, 1568];
    const f = notes[Math.min(Math.max(combo, 0), notes.length - 1)];
    this.tone(f, f, 0.1, "triangle", 0.18);
    this.tone(f * 1.5, f * 1.5, 0.16, "sine", 0.1, 0.05);
  }
  spring() {
    this.tone(260, 1300, 0.35, "triangle", 0.28);
    this.tone(520, 1700, 0.3, "sine", 0.14, 0.05);
  }
  boost() {
    this.tone(360, 1800, 0.9, "sine", 0.2);
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, f, 0.2, "triangle", 0.12, 0.1 + i * 0.08));
  }
  stomp() {
    this.tone(280, 90, 0.18, "square", 0.14);
  }
  hurt() {
    this.tone(500, 120, 0.4, "square", 0.12);
  }
  die() {
    this.tone(660, 90, 0.9, "triangle", 0.28);
    this.tone(440, 70, 1.0, "sine", 0.18, 0.1);
  }
  milestone() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.3, "triangle", 0.18, i * 0.07));
  }
  fizz() {
    this.noise(0.35, 0.25, 3000);
    for (let i = 0; i < 8; i++) this.tone(500 + i * 120, 900 + i * 160, 0.06, "sine", 0.1, 0.1 + i * 0.05);
    this.tone(200, 1200, 0.7, "triangle", 0.2, 0.05);
  }
  pizza() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.14, "square", 0.08, i * 0.06));
    this.tone(220, 1100, 0.6, "triangle", 0.22);
  }
  chirp() {
    for (let i = 0; i < 4; i++) {
      const f = 2200 + Math.random() * 900;
      this.tone(f, f * 1.4, 0.07, "sine", 0.06, i * 0.11);
    }
  }
  private lfoTone(base: number, lfoF: number, depth: number, type: OscillatorType, vol: number, dur: number) {
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = base;
    lfo.frequency.value = lfoF;
    lg.gain.value = depth;
    lfo.connect(lg);
    lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.1);
    lfo.stop(t + dur + 0.1);
  }
  plane() {
    this.lfoTone(85, 22, 8, "sawtooth", 0.035, 4.2);
  }
  ufo() {
    this.lfoTone(620, 6, 140, "sine", 0.07, 1.8);
  }
  alienTalk(delay: number) {
    for (let i = 0; i < 9; i++) {
      const f = 700 + Math.random() * 700;
      this.tone(f, f * (Math.random() < 0.5 ? 1.5 : 0.7), 0.08, "square", 0.05, delay + i * 0.12);
    }
  }
  click() {
    this.tone(700, 900, 0.06, "sine", 0.15);
  }
}
