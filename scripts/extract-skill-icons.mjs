/**
 * Game Icons (https://game-icons.net) — CC BY 3.0
 * 필요한 아이콘만 skillGameIcons.json 으로 추출
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import icons from '@iconify-json/game-icons/icons.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const POOLS = {
  heal: ['heart-plus', 'healing', 'health-potion', 'magic-potion', 'healing-shield'],
  cleanse: ['broom', 'water-recycling', 'sparkles', 'sunbeams', 'sun-radiations'],
  buff: ['upgrade', 'health-increase', 'muscle-up', 'strong', 'sun'],
  block: ['round-shield', 'bordered-shield', 'bolt-shield', 'shield-reflect', 'attached-shield'],
  fire: ['fireball', 'fire', 'flame', 'fire-bomb', 'campfire'],
  water: ['water-drop', 'droplets', 'water-splash', 'ice-cube', 'water-recycling'],
  thunder: ['chain-lightning', 'lightning-arc', 'thunderball', 'thunder-struck', 'electric'],
  poison: ['poison-bottle', 'poison-cloud', 'acid', 'death-juice', 'potion-of-madness'],
  none: ['crossed-swords', 'sword-clash', 'saber-slash', 'broadsword', 'ancient-sword'],
};

const names = [...new Set(Object.values(POOLS).flat())];
const out = {
  _license: 'Game Icons by game-icons.net — CC BY 3.0',
  icons: {} as Record<string, { body: string; w: number; h: number }>,
};

for (const name of names) {
  const ic = icons.icons[name];
  if (!ic) {
    console.warn('[extract-skill-icons] missing:', name);
    continue;
  }
  out.icons[name] = { body: ic.body, w: ic.width ?? 512, h: ic.height ?? 512 };
}

const dest = path.join(root, 'src/tuduk/data/skillGameIcons.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`[extract-skill-icons] ${Object.keys(out.icons).length} icons → ${dest} (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
