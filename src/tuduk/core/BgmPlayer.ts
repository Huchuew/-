import type { BgmSession } from '../data/rmmzBgm';
import type { RmmzBgmName } from '../data/rmmzBgm';
import { bgmPath } from '../data/rmmzBgm';

const FADE_STEPS = 22;
const FADE_STEP_MS = 40;

/** HTMLAudio BGM — 세션 단위 재생, 곡 종료 시 플레이리스트 다음 곡 크로스페이드 */
export class BgmPlayer {
  private current: HTMLAudioElement | null = null;
  private outgoing: HTMLAudioElement | null = null;
  private sessionKey = '';
  private playlist: RmmzBgmName[] = [];
  private playlistIndex = 0;
  private enabled = true;
  private baseVolume = 0.058;
  private volumeMul = 1;
  private fadeTimer = 0;
  private advanceTimer = 0;
  private advancing = false;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.teardown();
    else if (this.current) this.current.volume = this.baseVolume * this.volumeMul;
  }

  setVolumeMultiplier(mul: number) {
    this.volumeMul = Math.max(0, Math.min(1, mul));
    const vol = this.baseVolume * this.volumeMul;
    if (this.current) this.current.volume = vol;
    if (this.outgoing && !this.outgoing.paused) this.outgoing.volume = vol;
  }

  stop() {
    this.teardown();
  }

  playSession(session: BgmSession) {
    if (!this.enabled) return;
    if (session.key === this.sessionKey && this.current && !this.current.paused) return;

    this.teardown();
    this.sessionKey = session.key;
    this.playlist = session.playlist.length ? [...session.playlist] : [];
    this.playlistIndex = Math.max(0, Math.min(session.startIndex, this.playlist.length - 1));
    if (!this.playlist.length) return;
    this.startTrack(this.playlist[this.playlistIndex]!, false);
  }

  /** @deprecated — playSession 사용 */
  play(track: RmmzBgmName) {
    this.playSession({ key: track, playlist: [track], startIndex: 0 });
  }

  async preload(files: RmmzBgmName[]) {
    await Promise.all(files.map(f => this.warm(f)));
  }

  private warm(file: RmmzBgmName): Promise<void> {
    return new Promise(resolve => {
      const a = new Audio(bgmPath(file));
      a.preload = 'auto';
      const done = () => {
        a.removeAttribute('src');
        a.load();
        resolve();
      };
      a.addEventListener('canplaythrough', done, { once: true });
      a.addEventListener('error', done, { once: true });
      a.load();
      setTimeout(done, 4000);
    });
  }

  private teardown() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = 0;
    }
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = 0;
    }
    this.detach(this.current);
    this.detach(this.outgoing);
    this.current = null;
    this.outgoing = null;
    this.sessionKey = '';
    this.playlist = [];
    this.playlistIndex = 0;
    this.advancing = false;
  }

  private detach(audio: HTMLAudioElement | null) {
    if (!audio) return;
    audio.onended = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  private startTrack(track: RmmzBgmName, crossfade: boolean) {
    if (!this.enabled || !this.sessionKey) return;

    const next = new Audio(bgmPath(track));
    next.loop = false;
    next.volume = crossfade ? 0 : this.baseVolume * this.volumeMul;
    next.preload = 'auto';
    next.onended = () => this.advancePlaylist();

    const prev = crossfade ? this.current : null;
    if (prev) {
      this.outgoing = prev;
    } else {
      this.detach(this.outgoing);
      this.outgoing = null;
    }
    this.current = next;

    const begin = () => {
      if (this.current !== next) return;
      void next.play().catch(() => {});
      if (crossfade && prev) this.crossfade(next, prev);
      else next.volume = this.baseVolume * this.volumeMul;
    };

    if (next.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) begin();
    else next.addEventListener('canplaythrough', begin, { once: true });

    next.addEventListener('error', () => {
      if (this.current === next) this.advancePlaylist();
    }, { once: true });

    next.load();
  }

  private advancePlaylist() {
    if (!this.enabled || !this.sessionKey || this.advancing) return;
    if (!this.playlist.length) return;
    this.advancing = true;

    const prev = this.current;
    const sessionKey = this.sessionKey;
    this.playlistIndex = (this.playlistIndex + 1) % this.playlist.length;
    const track = this.playlist[this.playlistIndex]!;

    this.advanceTimer = window.setTimeout(() => {
      this.advanceTimer = 0;
      this.advancing = false;
      if (!this.enabled || !this.sessionKey || sessionKey !== this.sessionKey) return;
      this.outgoing = prev;
      this.startTrack(track, true);
    }, 80);
  }

  private crossfade(next: HTMLAudioElement, prev: HTMLAudioElement) {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    let step = 0;
    this.fadeTimer = window.setInterval(() => {
      step++;
      const t = Math.min(1, step / FADE_STEPS);
      if (this.current === next) next.volume = this.baseVolume * this.volumeMul * t;
      if (!prev.paused) prev.volume = this.baseVolume * this.volumeMul * (1 - t);
      if (step >= FADE_STEPS) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = 0;
        this.detach(prev);
        if (this.outgoing === prev) this.outgoing = null;
        if (this.current === next) next.volume = this.baseVolume * this.volumeMul;
      }
    }, FADE_STEP_MS);
  }
}

export const bgmPlayer = new BgmPlayer();
