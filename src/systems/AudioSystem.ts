export class AudioSystem {
  private ctx: AudioContext | null = null;
  masterVolume = 1;
  sfxVolume = 1;

  private ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private vol(scale = 1) {
    return scale * this.sfxVolume * this.masterVolume;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    const v = this.vol(volume);
    gain.gain.setValueAtTime(v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playPop() {
    this.playTone(520, 0.06, 'sine', 0.15);
  }

  playMatch() {
    this.playTone(330, 0.08, 'triangle', 0.2);
    setTimeout(() => this.playTone(440, 0.1, 'triangle', 0.25), 50);
  }

  playCombo(level: number) {
    const base = 400 + level * 80;
    this.playTone(base, 0.08, 'square', 0.15 + level * 0.03);
    setTimeout(() => this.playTone(base * 1.25, 0.12, 'square', 0.2), 40);
  }

  playHand(power: number) {
    const notes = [262, 330, 392, 523, 659];
    notes.slice(0, Math.min(power, 5)).forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.15, 'triangle', 0.2), i * 60);
    });
  }

  playChip() { this.playTone(880, 0.08, 'sine', 0.2); }
  playExplosion() {
    this.playTone(80, 0.3, 'sawtooth', 0.35);
    setTimeout(() => this.playTone(40, 0.2, 'sawtooth', 0.25), 80);
  }
  playBoss() { this.playTone(55, 0.4, 'sawtooth', 0.45); }

  playHit() {
    this.playTone(120, 0.06, 'square', 0.25);
    setTimeout(() => this.playTone(80, 0.1, 'sawtooth', 0.2), 30);
  }

  playSkill() {
    [392, 523, 659, 784].forEach((n, i) =>
      setTimeout(() => this.playTone(n, 0.12, 'triangle', 0.28), i * 45),
    );
  }

  playCrit() {
    [523, 659, 784, 1047].forEach((n, i) =>
      setTimeout(() => this.playTone(n, 0.1, 'square', 0.32), i * 35),
    );
  }

  playWaveClear() {
    this.playTone(440, 0.1, 'triangle', 0.3);
    setTimeout(() => this.playTone(554, 0.12, 'triangle', 0.35), 80);
    setTimeout(() => this.playTone(659, 0.15, 'triangle', 0.4), 160);
  }
  playJoker() {
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => this.playTone(n, 0.2, 'square', 0.3), i * 70));
  }
}
