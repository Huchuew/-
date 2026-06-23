import { BOARD_SIZE } from '../data/constants';
import type { CardData, CardSuit, CellPos, RunModifiers, SpecialType } from '../data/types';

const SUITS: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export class BoardModel {
  grid: (CardData | null)[][] = [];
  private nextId = 0;
  private rng: () => number;

  constructor(seed?: number) {
    this.rng = seed != null ? mulberry32(seed) : Math.random;
    this.clear();
  }

  clear() {
    this.grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    this.nextId = 0;
  }

  fill(mod: RunModifiers) {
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        this.grid[y][x] = this.spawnCard(mod);
    this.ensurePlayableClusters(3);
  }

  /** 같은 문양 3개 이상 연결 가능하도록 보장 */
  private ensurePlayableClusters(count: number) {
    for (let n = 0; n < count; n++) {
      const suit = SUITS[Math.floor(this.rng() * 4)];
      const sx = 1 + Math.floor(this.rng() * (BOARD_SIZE - 3));
      const sy = 1 + Math.floor(this.rng() * (BOARD_SIZE - 2));
      const horizontal = this.rng() > 0.5;
      for (let i = 0; i < 3; i++) {
        const x = horizontal ? sx + i : sx;
        const y = horizontal ? sy : sy + i;
        this.grid[y][x] = this.makeTile(suit);
      }
    }
  }

  makeTile(suit: CardSuit, special: SpecialType = 'none'): CardData {
    return { id: this.nextId++, rank: 7, suit, special };
  }

  spawnCard(mod: RunModifiers): CardData {
    const suit = SUITS[Math.floor(this.rng() * 4)];
    if (this.rng() < mod.specialRate) {
      return this.makeTile(suit, 'bomb');
    }
    return this.makeTile(suit);
  }

  get(x: number, y: number): CardData | null {
    if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return null;
    return this.grid[y][x];
  }

  /** 플러시 메이커 — 같은 문양만 연결 */
  canConnect(a: CardData, b: CardData): boolean {
    return a.suit === b.suit;
  }

  isAdjacent(a: CellPos, b: CellPos): boolean {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx <= 1 && dy <= 1 && dx + dy > 0;
  }

  isValidPath(path: CellPos[]): boolean {
    if (path.length < 3) return false;
    const first = this.get(path[0].x, path[0].y);
    if (!first) return false;

    const targetSuit = first.suit;
    const seen = new Set<string>();

    for (let i = 0; i < path.length; i++) {
      const key = `${path[i].x},${path[i].y}`;
      if (seen.has(key)) return false;
      seen.add(key);

      const card = this.get(path[i].x, path[i].y);
      if (!card || card.suit !== targetSuit) return false;
      if (i > 0 && !this.isAdjacent(path[i - 1], path[i])) return false;
    }
    return true;
  }

  getCardsFromPath(path: CellPos[]): CardData[] {
    return path.map(p => this.get(p.x, p.y)!).filter(Boolean);
  }

  removeCells(cells: CellPos[]) {
    for (const { x, y } of cells) this.grid[y][x] = null;
  }

  applyGravity(mod: RunModifiers): number {
    let spawned = 0;
    for (let x = 0; x < BOARD_SIZE; x++) {
      const col: (CardData | null)[] = [];
      for (let y = BOARD_SIZE - 1; y >= 0; y--)
        if (this.grid[y][x]) col.push(this.grid[y][x]);
      for (let y = BOARD_SIZE - 1; y >= 0; y--) {
        const idx = BOARD_SIZE - 1 - y;
        if (idx < col.length) this.grid[y][x] = col[idx];
        else {
          this.grid[y][x] = this.spawnCard(mod);
          spawned++;
        }
      }
    }
    return spawned;
  }

  getSpecialCells(x: number, y: number, special: SpecialType, bombRadius: number): CellPos[] {
    const cells: CellPos[] = [];
    if (special === 'bomb') {
      const r = 1 + bombRadius;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (this.get(nx, ny)) cells.push({ x: nx, y: ny });
        }
    }
    return cells;
  }

  findAutoCluster(): CellPos[] {
    const visited = new Set<string>();
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const key = `${x},${y}`;
        if (visited.has(key) || !this.get(x, y)) continue;
        const cluster = this.floodFill(x, y, visited);
        if (cluster.length >= 3) return cluster;
      }
    }
    return [];
  }

  private floodFill(sx: number, sy: number, globalVisited: Set<string>): CellPos[] {
    const start = this.get(sx, sy)!;
    const targetSuit = start.suit;
    const result: CellPos[] = [];
    const queue: CellPos[] = [{ x: sx, y: sy }];
    const local = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;
      if (local.has(key)) continue;

      const card = this.get(x, y);
      if (!card || card.suit !== targetSuit) continue;

      local.add(key);
      globalVisited.add(key);
      result.push({ x, y });

      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (this.get(nx, ny) && !local.has(`${nx},${ny}`)) queue.push({ x: nx, y: ny });
        }
    }
    return result;
  }
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
