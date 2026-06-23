/** 재료 획득 경로 — UI 힌트·도감용 */
export const MATERIAL_SOURCES: Record<string, string> = {
  iron_ore: '던전 드롭 · 채광장 · 행운 재료상자 · 파견',
  wood_chip: '던전 드롭 · 행운 재료상자 · 파견',
  slime_gel: '던전 드롭 · 행운 재료상자 · 파견',
  beast_fang: '던전 드롭(중층+) · 행운 재료상자 · 파견',
  magic_dust: '던전 드롭 · 용광로 · 행운 재료상자 · 파견',
  healing_herb: '약초원 · 던전(미니상자) · 행운 재료상자',
  rare_ore: '희귀 고블린 · 심층 채광 · 행운 재료상자 · 채광장 보너스',
  shadow_wing: '희귀 박쥐(2층) · 행운 재료상자 · 13층 파견',
  legend_scale: '희귀 드래곤(10층) · 고층 던전 · 행운 재료상자',
  spirit_thread: '9층+ 던전 · 엘리트 보너스 · 행운 재료상자 · 10·15층 파견',
  void_shard: '차원 균열 · 12층+ 던전(엘리트) · 행운 재료상자',
  rift_crystal: '차원 균열(5·10층) · 고층 던전(엘리트) · 행운 재료상자',
};

export function formatMaterialSourceHint(matKey: string): string | null {
  return MATERIAL_SOURCES[matKey] ?? null;
}
