-- 1. Mesajları okuyabilmek için SELECT izni verelim (Aksi takdirde abone olunan veriler boş döner)
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);

-- 2. Özel (Birebir) Chat odasının gerçek zamanlı güncellenmesi için messages tablosunu Realtime'a ekleyelim
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 3. Trigger (Tetikleyici) Güncellemesi: SADECE Genel Meydana atılan mesajları (receiver_id IS NULL) etrafa dağıt!
-- Birebir mesajlaşmalar başkalarına dağıtılmamalıdır.
CREATE OR REPLACE FUNCTION distribute_message()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
  v_anon_name text;
BEGIN
  -- Eğer mesajın alıcısı belli ise (özel mesaj), dağıtımı iptal et.
  IF NEW.receiver_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Gönderenin anonim ismini bulalım
  SELECT anonymous_name INTO v_anon_name 
  FROM public.profiles 
  WHERE id = NEW.sender_id;

  -- Sadece Meydan (Genel) mesajlarını yakındaki kullanıcılara dağıtalım
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
