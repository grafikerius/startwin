-- 1. Bot Profillerini Oluştur
INSERT INTO public.profiles (id, anonymous_name, gender, birth_date, sun_sign, mbti_type, fields, location, last_seen)
VALUES 
  -- Yıldız Tozu (Kadın)
  ('a0000000-0000-0000-0000-00000000000a', 'Yıldız Tozu', 'female', '1998-05-15', 'Taurus', 'ENFP', '{"art", "music"}', ST_SetSRID(ST_MakePoint(35.0, 39.0), 4326), now() + interval '100 years'),
  -- Kozmik Gezgin (Erkek)
  ('b0000000-0000-0000-0000-00000000000b', 'Kozmik Gezgin', 'male', '1995-11-20', 'Scorpio', 'INTJ', '{"science", "writing"}', ST_SetSRID(ST_MakePoint(35.0, 39.0), 4326), now() + interval '100 years')
ON CONFLICT (id) DO UPDATE SET 
  anonymous_name = EXCLUDED.anonymous_name,
  gender = EXCLUDED.gender,
  last_seen = now() + interval '100 years';

-- 2. Botların konumunu mesaj attığı kişiye eşitleyerek cevap verme fonksiyonu (RPC)
CREATE OR REPLACE FUNCTION insert_bot_reply(p_bot_id uuid, p_target_user_id uuid, p_message text)
RETURNS void AS $$
DECLARE
  v_loc geography;
BEGIN
  -- Hedef kullanıcının konumunu al
  SELECT location INTO v_loc FROM public.profiles WHERE id = p_target_user_id;
  
  -- Botun konumunu hedefe eşitle ve aktifliğini güncelle
  UPDATE public.profiles 
  SET location = v_loc, last_seen = now() + interval '100 years' 
  WHERE id = p_bot_id;

  -- Bot adına mesajı ekle
  INSERT INTO public.messages (sender_id, message_text, sender_location)
  VALUES (p_bot_id, p_message, v_loc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_net eklentisini aktif et (webhook için gerekli)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Webhook (Yeni bir public mesaj gelirse Vercel API'sine haber ver)
CREATE OR REPLACE FUNCTION trigger_vercel_bot_webhook()
RETURNS trigger AS $$
BEGIN
  -- Eğer mesaj bir bottan geliyorsa sonsuz döngüye girmemek için dur
  IF NEW.sender_id IN ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b') THEN
    RETURN NEW;
  END IF;

  -- Eğer mesaj özel sohbete (receiver_id) atılmışsa botu karıştırma
  IF NEW.receiver_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Vercel'e async HTTP POST isteği gönder (Bu istek anında döner, bekleme yapmaz)
  -- Supabase Edge Function yerine Vercel sunucusunu çağırıyoruz
  PERFORM net.http_post(
    url := 'https://startwin-eta.vercel.app/api/bot',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Varolan trigger'ı temizle (varsa)
DROP TRIGGER IF EXISTS bot_webhook_trigger ON public.messages;

-- Trigger'ı oluştur
CREATE TRIGGER bot_webhook_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION trigger_vercel_bot_webhook();
