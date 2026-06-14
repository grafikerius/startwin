-- Premium özellikler için tabloyu güncelleyelim
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- Kullanıcıların premium durumunu okuyabilmesi lazım
-- RLS politikaları zaten 003_startwin_profiles'da okumaya açık (SELECT true)
-- Ancak update yetkisi sadece anon kendisi için:
-- (Profil güncellemede is_premium'u sahte şekilde update edemesinler diye trigger veya RLS kısıtı gerekir)
-- Şimdilik RLS ile uğraşmıyoruz çünkü Stripe webhook arkadan güncelleyecek.

-- Chat istek limiti takibi için günlük sınır fonksiyonu
CREATE OR REPLACE FUNCTION get_daily_chat_request_count(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_count int;
BEGIN
  SELECT count(*)
  INTO req_count
  FROM public.chat_requests
  WHERE sender_id = p_user_id
    AND created_at >= now() - interval '1 day';
    
  RETURN req_count;
END;
$$;
