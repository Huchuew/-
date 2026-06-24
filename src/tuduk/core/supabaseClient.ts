import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PlayerProfileRow = {
  id: string;
  player_id: string;
  nickname: string;
  team_name: string;
  max_region: number;
  party_size: number;
  roster_size: number;
  top_dps: number;
  party_dps: number;
  weekly_score: number;
  week_id: string;
  total_kills: number;
  touch_count?: number;
  party_elites?: PartyEliteSnapshot[] | null;
  spire_best?: number;
  updated_at: string;
  created_at: string;
};

export type PartyEliteSnapshot = {
  charId: string;
  level: number;
  name: string;
};

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.startsWith('http'));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
