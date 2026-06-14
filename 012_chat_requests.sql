CREATE TABLE IF NOT EXISTS public.chat_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (sender_id, receiver_id) -- Arama isteği spamini önler
);

ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;

-- Herkes her isteği okuyabilir (Meydanın anonimliği gereği)
CREATE POLICY "Users can read all chat requests" ON public.chat_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert chat requests" ON public.chat_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their chat requests" ON public.chat_requests FOR UPDATE USING (true);

-- Realtime için yayınlara ekleyelim
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
