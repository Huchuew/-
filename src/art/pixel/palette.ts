/** 스타일 가이드 팔레트 — SD 판타지 RPG */
export const PAL: Record<string, number | null> = {
  '.': null,
  'k': 0x2a2030, 'K': 0x1a1020,
  'o': 0xffcc99, 'O': 0xe8a86a,
  'b': 0x4a9eff, 'B': 0x2266cc,
  'r': 0xff5566, 'R': 0xcc3344,
  'g': 0x5cd97a, 'G': 0x3aab55,
  'y': 0xffdd55, 'Y': 0xccaa22,
  'p': 0xb57bff, 'P': 0x7733cc,
  'w': 0xffffff, 'W': 0xeeeeee,
  'n': 0xffaacc, 'N': 0xdd6699,
  'h': 0xc8a882, 'H': 0x9a7a5a,
  's': 0xb8c8d8, 'S': 0x8899aa,
  'l': 0xffeebb, 'L': 0xddcc88,
  'm': 0x8b5a2b, 'M': 0x6b3a1b,
  'c': 0xff8844, 'C': 0xdd6622,
  'a': 0xffd700, 'A': 0xcc9900,
  'i': 0x66ddff, 'I': 0x3399cc,
  'e': 0x44ee88, 'E': 0x22aa55,
  'u': 0x8866ff, 'U': 0x5533cc,
  't': 0x88ccff, 'T': 0x5599dd,
};

export type PixelGrid = (number | null)[][];

export function parseArt(rows: string[]): PixelGrid {
  return rows.map(row =>
    [...row].map(ch => PAL[ch] ?? null),
  );
}
