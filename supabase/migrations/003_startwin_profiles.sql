-- 1. Add StarTwin columns to profiles table and receiver_id to messages
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS sun_sign text,
  ADD COLUMN IF NOT EXISTS mbti_type char(4),
  ADD COLUMN IF NOT EXISTS fields text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS height smallint,
  ADD COLUMN IF NOT EXISTS weight smallint,
  ADD COLUMN IF NOT EXISTS ebced_val int;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Drop the old get_nearby_users function so we can replace it with the new return type
DROP FUNCTION IF EXISTS get_nearby_users(float, float, float);

-- 3. Create the new get_nearby_users function returning all StarTwin data
CREATE OR REPLACE FUNCTION get_nearby_users(p_lat float, p_lng float, p_radius_meters float DEFAULT 500)
RETURNS TABLE (
  id uuid,
  anonymous_name text,
  gender text,
  birth_date date,
  sun_sign text,
  mbti_type char(4),
  fields text[],
  height smallint,
  weight smallint,
  ebced_val int,
  distance_meters float
) AS $$
DECLARE
  search_point geography(Point, 4326);
BEGIN
  search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  RETURN QUERY
  SELECT 
    p.id,
    p.anonymous_name,
    p.gender,
    p.birth_date,
    p.sun_sign,
    p.mbti_type,
    p.fields,
    p.height,
    p.weight,
    p.ebced_val,
    ST_Distance(p.location, search_point) AS distance_meters
  FROM public.profiles p
  WHERE p.last_seen >= now() - interval '15 minutes'
    AND p.id != auth.uid() -- if using Supabase Auth (or just handle client side)
    AND ST_DWithin(p.location, search_point, p_radius_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the update_location function to optionally accept the profile data
DROP FUNCTION IF EXISTS update_location(uuid, float, float);

CREATE OR REPLACE FUNCTION update_location(
  p_user_id uuid, 
  p_lat float, 
  p_lng float,
  p_anon_name text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_sun_sign text DEFAULT NULL,
  p_mbti_type char(4) DEFAULT NULL,
  p_fields text[] DEFAULT NULL,
  p_height smallint DEFAULT NULL,
  p_weight smallint DEFAULT NULL,
  p_ebced_val int DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert or Update profile (Upsert)
  INSERT INTO public.profiles (
    id, anonymous_name, location, last_seen, 
    gender, birth_date, sun_sign, mbti_type, fields, height, weight, ebced_val
  )
  VALUES (
    p_user_id,
    COALESCE(p_anon_name, 'Gizemli Ruh'),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    now(),
    p_gender, p_birth_date, p_sun_sign, p_mbti_type, p_fields, p_height, p_weight, p_ebced_val
  )
  ON CONFLICT (id) DO UPDATE SET
    location = EXCLUDED.location,
    last_seen = EXCLUDED.last_seen,
    anonymous_name = COALESCE(EXCLUDED.anonymous_name, profiles.anonymous_name),
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    sun_sign = COALESCE(EXCLUDED.sun_sign, profiles.sun_sign),
    mbti_type = COALESCE(EXCLUDED.mbti_type, profiles.mbti_type),
    fields = COALESCE(EXCLUDED.fields, profiles.fields),
    height = COALESCE(EXCLUDED.height, profiles.height),
    weight = COALESCE(EXCLUDED.weight, profiles.weight),
    ebced_val = COALESCE(EXCLUDED.ebced_val, profiles.ebced_val);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
