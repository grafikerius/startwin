CREATE OR REPLACE FUNCTION distribute_message()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
  v_anon_name text;
BEGIN
  -- Fetch sender's anonymous name
  SELECT anonymous_name INTO v_anon_name 
  FROM public.profiles 
  WHERE id = NEW.sender_id;

  -- Create delivery records for nearby active users
  FOR r IN 
    SELECT p.id as receiver_id, ST_Distance(p.location, NEW.sender_location) as dist
    FROM public.profiles p
    WHERE p.last_seen >= now() - interval '15 minutes'
      AND ST_DWithin(p.location, NEW.sender_location, 5000)
  LOOP
    INSERT INTO public.message_deliveries (
      message_id, 
      receiver_id, 
      sender_id, 
      sender_anonymous_name, 
      message_text, 
      distance_meters
    )
    VALUES (
      NEW.id, 
      r.receiver_id, 
      NEW.sender_id, 
      COALESCE(v_anon_name, 'Gizemli Ruh'), 
      NEW.message_text, 
      r.dist
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
