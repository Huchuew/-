export class ComboSystem {
  combo = 0;
  multiplierBonus = 1;

  getMultiplier(): number {
    if (this.combo <= 1) return this.multiplierBonus;
    return (1 + (this.combo - 1) * 0.72) * this.multiplierBonus;
  }

  getShakeIntensity(): number {
    if (this.combo <= 1) return 0;
    if (this.combo <= 3) return 0.1;
    if (this.combo <= 5) return 0.18;
    if (this.combo <= 9) return 0.28;
    return 0.45;
  }

  getCryLabel(): string {
    if (this.combo >= 10) return '🔥 LEGENDARY!';
    if (this.combo >= 7) return '⚡ AWESOME!';
    if (this.combo >= 5) return '💥 GREAT!';
    if (this.combo >= 3) return '✨ NICE!';
    return '';
  }

  increment() { this.combo++; }
  reset() { this.combo = 0; }
}
