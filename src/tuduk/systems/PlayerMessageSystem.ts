import type { GameSave, PlayerMailEntry, PlayerMailKind } from '../types';
import { getOrCreatePlayerId } from '../core/playerId';
import { getSupabase, isSupabaseConfigured } from '../core/supabaseClient';
import { getAdventureTeamName, getPlayerNickname } from '../data/starterSurvey';

export type { PlayerMailEntry, PlayerMailKind };

function mailId(): string {
  return `mail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getRequesterIdentity(save: GameSave) {
  return {
    playerId: getOrCreatePlayerId(),
    nickname: getPlayerNickname(save) || '모험가',
    teamName: getAdventureTeamName(save) || '모험단',
  };
}

function ensureMail(save: GameSave): PlayerMailEntry[] {
  if (!save.playerMail) save.playerMail = [];
  return save.playerMail;
}

export function pushLocalMail(save: GameSave, entry: Omit<PlayerMailEntry, 'id' | 'read' | 'claimed' | 'createdAt'> & { id?: string }) {
  const list = ensureMail(save);
  list.unshift({
    id: entry.id ?? mailId(),
    read: false,
    claimed: false,
    createdAt: Date.now(),
    ...entry,
  });
  if (list.length > 40) save.playerMail = list.slice(0, 40);
}

export async function queueRemoteMail(payload: {
  toPlayerId: string;
  kind: PlayerMailKind;
  title: string;
  body: string;
  goldReward?: number;
  fromNickname?: string;
  fromTeam?: string;
}): Promise<void> {
  if (!isSupabaseConfigured() || payload.toPlayerId.startsWith('patrol_npc_') || payload.toPlayerId.startsWith('offline_')) {
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const row = {
    to_player_id: payload.toPlayerId,
    kind: payload.kind,
    title: payload.title,
    body: payload.body,
    gold_reward: payload.goldReward ?? 0,
    from_nickname: payload.fromNickname ?? '',
    from_team: payload.fromTeam ?? '',
    read: false,
    claimed: false,
  };
  const { error } = await sb.from('player_messages').insert(row);
  if (error) {
    console.warn('[PlayerMail] remote insert failed', error.message);
  }
}

export async function fetchRemoteMail(save: GameSave): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;
  const me = getOrCreatePlayerId();
  const { data, error } = await sb
    .from('player_messages')
    .select('*')
    .eq('to_player_id', me)
    .eq('claimed', false)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data?.length) return;

  const local = ensureMail(save);
  const existing = new Set(local.map(m => m.id));
  for (const row of data) {
    const id = `remote_${row.id}`;
    if (existing.has(id)) continue;
    local.unshift({
      id,
      kind: row.kind as PlayerMailKind,
      title: row.title,
      body: row.body,
      goldReward: row.gold_reward > 0 ? row.gold_reward : undefined,
      read: false,
      claimed: false,
      createdAt: new Date(row.created_at).getTime(),
      fromNickname: row.from_nickname,
      fromTeam: row.from_team,
    });
  }
}

export function getUnreadMailCount(save: GameSave): number {
  return (save.playerMail ?? []).filter(m => !m.read).length;
}

export function claimMailRewards(save: GameSave): { messages: string[]; gold: number } {
  const list = ensureMail(save);
  let gold = 0;
  const messages: string[] = [];
  for (const m of list) {
    if (m.claimed) continue;
    m.read = true;
    if (m.goldReward && m.goldReward > 0) {
      save.gold += m.goldReward;
      gold += m.goldReward;
      m.claimed = true;
      messages.push(`📬 ${m.title} — 🪙+${m.goldReward.toLocaleString()}`);
    }
  }
  return { messages, gold };
}

export function formatMailSummary(save: GameSave): string | null {
  const unread = (save.playerMail ?? []).filter(m => !m.read);
  if (!unread.length) return null;
  const m = unread[0]!;
  return m.title;
}

export function notifyRivalDefeat(
  save: GameSave,
  rival: { playerId: string; nickname: string; teamName: string },
): void {
  const req = getRequesterIdentity(save);
  pushLocalMail(save, {
    kind: 'rival_loss',
    title: '⚔️ 라이벌 격파 패배',
    body: `${rival.nickname}(${rival.teamName})에게 패배하였습니다.`,
    fromNickname: rival.nickname,
    fromTeam: rival.teamName,
  });
  void queueRemoteMail({
    toPlayerId: rival.playerId,
    kind: 'rival_victory',
    title: '⚔️ 라이벌 격파 승리',
    body: `${req.teamName}의 ${req.nickname}에게 라이벌 격파에서 승리했습니다.`,
    goldReward: Math.floor(400 + (save.maxRegion ?? 1) * 20),
    fromNickname: req.nickname,
    fromTeam: req.teamName,
  });
}

export function notifyRivalVictory(
  save: GameSave,
  rival: { playerId: string; nickname: string; teamName: string },
  rewardGold: number,
): void {
  const req = getRequesterIdentity(save);
  pushLocalMail(save, {
    kind: 'rival_victory',
    title: '⚔️ 라이벌 격파 승리',
    body: `${rival.nickname}(${rival.teamName}) 모험단을 격파했습니다! 🪙+${rewardGold.toLocaleString()}`,
    goldReward: 0,
    fromNickname: rival.nickname,
    fromTeam: rival.teamName,
  });
  void queueRemoteMail({
    toPlayerId: rival.playerId,
    kind: 'rival_defeat',
    title: '⚔️ 라이벌 격파 패배',
    body: `${req.teamName}의 ${req.nickname}에게 라이벌 격파에서 패배하였습니다.`,
    goldReward: 0,
    fromNickname: req.nickname,
    fromTeam: req.teamName,
  });
}

export async function processPlayerMailOnLodging(
  save: GameSave,
  showToast: (msg: string, success?: boolean) => void,
): Promise<void> {
  await fetchRemoteMail(save);
  const { messages } = claimMailRewards(save);
  for (const msg of messages) showToast(msg, true);
  const unread = (save.playerMail ?? []).filter(m => !m.read && !m.goldReward);
  for (const m of unread.slice(0, 2)) {
    m.read = true;
    showToast(`📬 ${m.body}`, m.kind === 'rival_victory');
  }
}
