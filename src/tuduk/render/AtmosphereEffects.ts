import type { AtmosphereType } from '../data/backgroundConfig';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: string;
}

export class AtmosphereEffects {
  private particles: Particle[] = [];
  private spawnAcc = 0;

  reset() {
    this.particles = [];
    this.spawnAcc = 0;
  }

  update(dt: number, w: number, h: number, type: AtmosphereType, scrollSpeed: number) {
    if (type === 'none') {
      this.particles.length = 0;
      return;
    }

    const rate = type === 'snow' ? 28 : type === 'grassland' ? 12 : 8;
    this.spawnAcc += dt * rate;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      this.spawn(w, h, type);
    }

    for (const p of this.particles) {
      p.x += (p.vx - scrollSpeed * 0.15) * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private spawn(w: number, h: number, type: AtmosphereType) {
    const base: Omit<Particle, 'x' | 'y'> = {
      vx: 0, vy: 0, life: 3, maxLife: 3, size: 3, hue: '#ffffff',
    };
    switch (type) {
      case 'grassland':
        this.particles.push({
          ...base, x: Math.random() * w, y: Math.random() * h * 0.5,
          vx: -40 - Math.random() * 30, vy: 20 + Math.random() * 40,
          life: 4 + Math.random() * 3, maxLife: 7, size: 2 + Math.random() * 2,
          hue: Math.random() > 0.5 ? '#ffaacd' : '#ffffff',
        });
        break;
      case 'forest':
        this.particles.push({
          ...base, x: Math.random() * w, y: Math.random() * h * 0.35,
          vx: -10, vy: 15, life: 2 + Math.random() * 2, maxLife: 4,
          size: 40 + Math.random() * 60, hue: 'rgba(255,255,200,',
        });
        break;
      case 'snow':
        this.particles.push({
          ...base, x: Math.random() * w, y: -10,
          vx: -15 + Math.random() * 30, vy: 40 + Math.random() * 50,
          life: 5 + Math.random() * 4, maxLife: 9, size: 1.5 + Math.random() * 2.5,
          hue: '#ffffff',
        });
        break;
      case 'desert':
        this.particles.push({
          ...base, x: Math.random() * w, y: h * 0.55 + Math.random() * h * 0.2,
          vx: -80 - Math.random() * 40, vy: -5 + Math.random() * 10,
          life: 1.5 + Math.random(), maxLife: 2.5, size: 1 + Math.random() * 2,
          hue: 'rgba(255,220,150,',
        });
        break;
      case 'volcano':
        this.particles.push({
          ...base, x: Math.random() * w, y: h * 0.7 + Math.random() * h * 0.15,
          vx: -20 + Math.random() * 40, vy: -60 - Math.random() * 80,
          life: 1.2 + Math.random() * 1.5, maxLife: 2.5,
          size: 2 + Math.random() * 4, hue: Math.random() > 0.4 ? '#ff6622' : '#ffcc44',
        });
        break;
      case 'beach':
        this.particles.push({
          ...base, x: -10, y: h * 0.75 + Math.random() * 20,
          vx: 50 + Math.random() * 30, vy: 0,
          life: 3 + Math.random() * 2, maxLife: 5, size: 8 + Math.random() * 20,
          hue: 'rgba(200,230,255,',
        });
        break;
      case 'graveyard':
        this.particles.push({
          ...base, x: Math.random() * w, y: h * 0.5 + Math.random() * h * 0.35,
          vx: -5 + Math.random() * 10, vy: -15 - Math.random() * 20,
          life: 2 + Math.random() * 3, maxLife: 5, size: 3 + Math.random() * 4,
          hue: '#88ccff',
        });
        break;
      case 'swamp':
        this.particles.push({
          ...base, x: Math.random() * w, y: h * 0.6 + Math.random() * h * 0.3,
          vx: -8 + Math.random() * 16, vy: -8 - Math.random() * 12,
          life: 4 + Math.random() * 4, maxLife: 8, size: 30 + Math.random() * 50,
          hue: 'rgba(180,220,180,',
        });
        break;
      case 'floating':
        this.particles.push({
          ...base, x: Math.random() * w, y: Math.random() * h * 0.4,
          vx: -25 - Math.random() * 20, vy: 5 + Math.random() * 10,
          life: 5 + Math.random() * 5, maxLife: 10, size: 20 + Math.random() * 40,
          hue: 'rgba(255,255,255,',
        });
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    for (const p of this.particles) {
      const a = Math.min(1, p.life / p.maxLife);
      if (p.hue.startsWith('rgba')) {
        ctx.fillStyle = `${p.hue}${a * 0.25})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 4, p.size, p.size * 0.4);
      } else if (p.hue === '#88ccff') {
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = p.hue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.hue;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.restore();
  }
}
