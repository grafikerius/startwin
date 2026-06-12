import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Celebrity } from './match';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// null when not configured → app silently uses the bundled dataset.
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

const COLUMNS = 'id,name_en,name_tr,gender,birth_date,sun_sign,height,fields,image_url,fame,turkish,moon_sign,mbti_type';

export async function fetchCelebrities(): Promise<Celebrity[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('celebrities')
    .select(COLUMNS)
    .order('fame', { ascending: false });
  if (error) {
    console.warn('[StarTwin] Supabase fetch failed, using bundled data:', error.message);
    return null;
  }
  return (data as unknown as Celebrity[]) ?? null;
}

export async function updateLocation(payload: any) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  return await supabase.rpc('update_location', payload);
}

export async function getNearbyUsers(lat: number, lng: number, radius = 500) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return await supabase.rpc('get_nearby_users', {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: radius
  });
}

export async function registerOrLogin(bioHash: string, password: string, realName: string) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return await supabase.rpc('register_or_login', {
    p_bio_hash: bioHash,
    p_password: password,
    p_real_name: realName
  });
}

export async function getSystemSettings() {
  if (!supabase) return null;
  const { data } = await supabase.rpc('get_system_settings');
  return data;
}

export async function updateSystemSettings(payload: any) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  return await supabase.rpc('update_system_settings', payload);
}
