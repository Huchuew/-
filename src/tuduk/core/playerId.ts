const PLAYER_ID_KEY = 'tuduk_player_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** 기기별 고유 ID — localStorage에 1회 생성 후 유지 */
export function getOrCreatePlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}
