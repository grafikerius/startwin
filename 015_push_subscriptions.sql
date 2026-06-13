CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Bir kullanıcı her giriş yaptığında aboneliğini güncelleyebilmesi için
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions(endpoint);

-- RLS (Güvenlik Politikaları)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Herkes ekleyebilir/güncelleyebilir (çünkü anonim de olsalar endpoint kendilerinden geliyor)
CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

-- Backend (Servis rolü) okuyabilir, ama frontend'den okunmasına gerek yok
CREATE POLICY "Nobody can read subscriptions from client"
ON public.push_subscriptions FOR SELECT
USING (false);
