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
    -- auth.uid() kontrolünü kaldırdık ki Supabase anonim hesaplarda boş dönmesin!
    AND ST_DWithin(p.location, search_point, p_radius_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
