-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add Auth fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_hash text UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS real_name text;

-- 2. Create RPC for Register or Login
CREATE OR REPLACE FUNCTION register_or_login(p_bio_hash text, p_password text, p_real_name text)
RETURNS TABLE (user_id uuid, is_new boolean, success boolean, message text) AS $$
DECLARE
  v_user_id uuid;
  v_hash text;
  v_is_new boolean;
BEGIN
  -- Try to find existing profile
  SELECT id, password_hash INTO v_user_id, v_hash FROM public.profiles WHERE bio_hash = p_bio_hash;
  
  IF v_user_id IS NOT NULL THEN
    -- Profile exists, check password
    IF v_hash = crypt(p_password, v_hash) THEN
      RETURN QUERY SELECT v_user_id, false, true, 'Login successful'::text;
    ELSE
      RETURN QUERY SELECT v_user_id, false, false, 'Invalid password'::text;
    END IF;
  ELSE
    -- Profile does not exist, create new
    v_user_id := gen_random_uuid();
    INSERT INTO public.profiles (id, bio_hash, password_hash, real_name)
    VALUES (v_user_id, p_bio_hash, crypt(p_password, gen_salt('bf')), p_real_name);
    
    RETURN QUERY SELECT v_user_id, true, true, 'Registration successful'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the distribute_message trigger to 5000m (5km)
CREATE OR REPLACE FUNCTION distribute_message()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.id as receiver_id, ST_Distance(p.location, NEW.sender_location) as dist
    FROM public.profiles p
    WHERE p.last_seen >= now() - interval '15 minutes'
      AND ST_DWithin(p.location, NEW.sender_location, 5000)
  LOOP
    INSERT INTO public.message_deliveries (message_id, receiver_id, distance_meters)
    VALUES (NEW.id, r.receiver_id, r.dist);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate update_location to make sure it doesn't overwrite real_name with anon_name mistakenly, 
-- but we already have anonymous_name separated. We just need to ensure the client doesn't pass real_name to anonymous_name.
