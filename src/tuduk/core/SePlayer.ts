import { sePath, type RmmzSeName } from '../data/rmmzSe';

const MIN_INTERVAL_MS = 45;
const GLOBAL_MIN_INTERVAL_MS = 52;

let combatPerfSeBudget = false;

/** 속파 중 SE 전역 스로틀 (AdventureSystem에서 토글) */
export function setCombatPerfSeBudget(on: boolean) {
  combatPerfSeBudget = on;
}

export class SePlayer {
  private cache = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private lastPlayed = new Map<string, number>();
  private lastGlobalMs = 0;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private enabled = true;
  private ready = false;

  attach(ctx: AudioContext, gain: GainNode) {
    this.ctx = ctx;
    this.gain = gain;
    this.ready = true;
  }

  setEnabled(on: boolean) { this.enabled = on; }

  async preload(files: RmmzSeName[]) {
    await Promise.all(files.map(f => this.load(f)));
  }

  private async load(file: RmmzSeName): Promise<AudioBuffer | null> {
    const url = sePath(file);
    if (this.cache.has(url)) return this.cache.get(url)!;
    if (this.pending.has(url)) return this.pending.get(url)!;

    const job = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const ab = await res.arrayBuffer();
        if (!this.ctx) return null;
        const buf = await this.ctx.decodeAudioData(ab);
        this.cache.set(url, buf);
        return buf;
      } catch {
        return null;
      } finally {
        this.pending.delete(url);
      }
    })();
    this.pending.set(url, job);
    return job;
  }

  /** volume 0~1, 기본은 은은하게 */
  play(file: RmmzSeName | string, volume = 0.22, rate = 1) {
    if (!this.enabled || !this.ctx || !this.gain) return;
    const url = file.includes('/') ? file : sePath(file);
    const now = performance.now();
    if (combatPerfSeBudget && now - this.lastGlobalMs < GLOBAL_MIN_INTERVAL_MS) return;
    const last = this.lastPlayed.get(url) ?? 0;
    if (now - last < MIN_INTERVAL_MS) return;
    this.lastPlayed.set(url, now);
    this.lastGlobalMs = now;

    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const playBuf = (buf: AudioBuffer) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
      const g = this.ctx!.createGain();
      g.gain.value = Math.min(0.38, volume);
      src.connect(g);
      g.connect(this.gain!);
      src.start();
    };

    const cached = this.cache.get(url);
    if (cached) {
      playBuf(cached);
      return;
    }
    void this.load(file as RmmzSeName).then(buf => {
      if (buf) playBuf(buf);
    });
  }
}

export const sePlayer = new SePlayer();
