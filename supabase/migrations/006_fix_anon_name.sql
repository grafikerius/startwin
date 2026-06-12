CREATE OR REPLACE FUNCTION register_or_login(p_bio_hash text, p_password text, p_real_name text)
RETURNS TABLE (user_id uuid, is_new boolean, success boolean, message text) AS $$
DECLARE
  v_user_id uuid;
  v_hash text;
BEGIN
  -- Try to find existing profile
  SELECT id, password_hash INTO v_user_id, v_hash FROM public.profiles WHERE bio_hash = p_bio_hash;
  
  IF v_user_id IS NOT NULL THEN
    -- Profile exists
    IF v_hash IS NULL THEN
      -- Legacy profile that has no password yet
      UPDATE public.profiles SET password_hash = crypt(p_password, gen_salt('bf')) WHERE id = v_user_id;
      RETURN QUERY SELECT v_user_id, false, true, 'Profil şifrelendi ve giriş yapıldı'::text;
    ELSIF v_hash = crypt(p_password, v_hash) THEN
      -- Password correct
      RETURN QUERY SELECT v_user_id, false, true, 'Giriş başarılı'::text;
    ELSE
      RETURN QUERY SELECT v_user_id, false, false, 'Geçersiz şifre'::text;
    END IF;
  ELSE
    -- Profile does not exist, create new
    v_user_id := gen_random_uuid();
    
    -- Insert a temporary anonymous_name to satisfy the NOT NULL constraint.
    -- It will be overwritten immediately by the client's updateLocation call.
    INSERT INTO public.profiles (id, bio_hash, password_hash, real_name, anonymous_name)
    VALUES (v_user_id, p_bio_hash, crypt(p_password, gen_salt('bf')), p_real_name, 'Gizemli Ruh');
    
    RETURN QUERY SELECT v_user_id, true, true, 'Kayıt başarılı'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
