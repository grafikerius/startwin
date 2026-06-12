-- 1. Function to periodically update location
CREATE OR REPLACE FUNCTION update_location(p_user_id uuid, p_lat float, p_lng float)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    last_seen = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to find nearby active users (within 5 minutes, specific radius)
-- Returns the distance in meters alongside the user info.
CREATE OR REPLACE FUNCTION get_nearby_users(p_lat float, p_lng float, p_radius_meters float DEFAULT 100)
RETURNS TABLE (
  id uuid,
  anonymous_name text,
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
    ST_Distance(p.location, search_point) AS distance_meters
  FROM public.profiles p
  WHERE p.last_seen >= now() - interval '5 minutes'
    AND ST_DWithin(p.location, search_point, p_radius_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
