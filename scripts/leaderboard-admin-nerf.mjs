/**
 * Supabase player_profiles 일괄 시즌 너프
 * 사용: SUPABASE_SERVICE_ROLE_KEY=... node scripts/leaderboard-admin-nerf.mjs
 * (또는 .env.local 에 VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url?.startsWith('http')) {
  console.error('VITE_SUPABASE_URL 필요');
  process.exit(1);
}

const key = serviceKey || anonKey;
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 또는 VITE_SUPABASE_ANON_KEY 필요');
  process.exit(1);
}

const LEADERBOARD_RANK_CAP_FLOOR = 17;
const LEADERBOARD_SPIRE_MIN_REGION = 19;
const LEADERBOARD_LEVEL_SOFT_CAP = 300;
const TOP_NICK = '김러너';

function hasLegitimateSpire(row) {
  return (row.spire_best ?? 0) > 0 && (row.max_region ?? 1) >= LEADERBOARD_SPIRE_MIN_REGION;
}

function compareRows(a, b) {
  return (b.spire_best ?? 0) - (a.spire_best ?? 0)
    || (b.max_region - a.max_region)
    || (b.party_dps - a.party_dps)
    || (b.roster_size - a.roster_size);
}

function clampLevel(level) {
  if (level <= LEADERBOARD_LEVEL_SOFT_CAP) return level;
  return 270 + (level % 10);
}

function normalizeElites(elites) {
  if (!Array.isArray(elites)) return [];
  return elites.map(e => ({ ...e, level: clampLevel(Number(e.level) || 1) }));
}

function nerfMult(row) {
  let mult = 1;
  const maxR = row.max_region ?? 1;
  const floorOver = Math.max(0, maxR - LEADERBOARD_RANK_CAP_FLOOR);
  const elites = normalizeElites(row.party_elites);
  const hadSpire = (row.spire_best ?? 0) > 0;
  const legitSpire = hasLegitimateSpire(row);
  if (floorOver > 0 && !legitSpire) mult *= Math.max(0.34, 0.68 - floorOver * 0.09);
  if (hadSpire && !legitSpire) mult *= 0.58;
  if (elites.some(e => e.level > LEADERBOARD_LEVEL_SOFT_CAP)) mult *= 0.58;
  return mult;
}

function normalizeRow(row) {
  const mult = nerfMult(row);
  const keepSpire = hasLegitimateSpire(row) && row.nickname !== TOP_NICK;
  return {
    ...row,
    max_region: Math.min(row.max_region ?? 1, LEADERBOARD_RANK_CAP_FLOOR),
    party_dps: Math.floor((row.party_dps ?? 0) * mult),
    top_dps: Math.floor((row.top_dps ?? 0) * mult),
    total_kills: Math.floor(Number(row.total_kills ?? 0) * mult),
    weekly_score: Math.floor((row.weekly_score ?? 0) * mult),
    spire_best: keepSpire ? (row.spire_best ?? 0) : 0,
    party_elites: normalizeElites(row.party_elites),
    updated_at: new Date().toISOString(),
  };
}

function applyTopGap(rows) {
  const sorted = [...rows].sort(compareRows);
  if (sorted.length < 2) return rows;
  const second = sorted[1];
  const kim = rows.find(r => r.nickname === TOP_NICK);
  const topId = kim?.player_id ?? sorted[0].player_id;
  const gap = kim ? 1.08 : 1.11;
  const capDps = Math.floor(second.party_dps * gap);
  const capTop = Math.floor(second.top_dps * gap);
  return rows.map((r) => {
    if (r.player_id !== topId) return r;
    return {
      ...r,
      party_dps: Math.min(r.party_dps, capDps),
      top_dps: Math.min(r.top_dps, capTop),
      weekly_score: Math.min(r.weekly_score, Math.floor(second.weekly_score * (gap + 0.03))),
      total_kills: Math.min(Number(r.total_kills), Math.floor(Number(second.total_kills) * gap)),
      spire_best: 0,
      max_region: Math.min(r.max_region, LEADERBOARD_RANK_CAP_FLOOR),
    };
  });
}

const sb = createClient(url, key);

const { data, error } = await sb.from('player_profiles').select('*');
if (error) {
  console.error('fetch failed', error);
  process.exit(1);
}

const normalized = applyTopGap((data ?? []).map(normalizeRow));
let ok = 0;
let fail = 0;

for (const row of normalized) {
  const { player_id, nickname, max_region, party_dps, spire_best, ...rest } = row;
  const patch = {
    player_id,
    nickname,
    max_region,
    party_dps,
    spire_best: spire_best ?? 0,
    ...rest,
  };
  const { error: upErr } = await sb.from('player_profiles').upsert(patch, { onConflict: 'player_id' });
  if (upErr) {
    fail++;
    console.warn('fail', nickname, upErr.message);
  } else {
    ok++;
    if (nickname === TOP_NICK) {
      console.log(`[김러너] max_region=${max_region} party_dps=${party_dps} spire=0`);
    }
  }
}

console.log(`done: ${ok} updated, ${fail} failed (${normalized.length} rows)`);
if (!serviceKey) {
  console.warn('service role 없음 — RLS로 일부 행이 실패할 수 있습니다');
}
