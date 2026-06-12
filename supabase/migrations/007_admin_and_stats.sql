-- Admin settings tablosu
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Varsayılan admin şifresi
INSERT INTO public.admin_settings (key, value)
VALUES ('admin_password', 'KozmikAdmin2026!')
ON CONFLICT (key) DO NOTHING;

-- Admin istatistiklerini getiren güvenli fonksiyon
CREATE OR REPLACE FUNCTION get_admin_stats(p_password text)
RETURNS json AS $$
DECLARE
  v_real_password text;
  v_total_users int;
  v_active_users int;
  v_public_messages int;
  v_private_messages int;
  v_result json;
BEGIN
  -- Şifre doğrulama
  SELECT value INTO v_real_password FROM public.admin_settings WHERE key = 'admin_password';
  IF v_real_password IS NULL OR v_real_password != p_password THEN
    -- Yanlış şifre durumunda boş dön veya hata fırlat. 
    -- Güvenlik için hata fırlatalım ki Supabase API 400 dönsün.
    RAISE EXCEPTION 'Yetkisiz erişim: Şifre hatalı';
  END IF;

  -- İstatistikleri topla
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  
  -- Son 24 saat içinde lokasyonunu güncellemiş (uygulamayı açmış) aktif kullanıcılar
  SELECT COUNT(*) INTO v_active_users FROM public.profiles WHERE last_seen >= now() - interval '24 hours';
  
  -- Genel meydana atılan mesajlar
  SELECT COUNT(*) INTO v_public_messages FROM public.messages WHERE receiver_id IS NULL;
  
  -- Özel odalarda (birebir) atılan mesajlar
  SELECT COUNT(*) INTO v_private_messages FROM public.messages WHERE receiver_id IS NOT NULL;

  -- JSON olarak paketle
  v_result := json_build_object(
    'total_users', v_total_users,
    'active_users_24h', v_active_users,
    'public_messages', v_public_messages,
    'private_messages', v_private_messages
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
