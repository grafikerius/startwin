-- 1. Profiles tablosuna avatar_url sütunu ekle (Eğer yoksa)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Avatarlar için Storage (Depolama) Kovası oluştur
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage için Güvenlik Kuralları (RLS)
-- Herkes avatarları görebilir (Public Read)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Sadece giriş yapmış kullanıcılar (Anonim dahil) fotoğraf yükleyebilir
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Kullanıcılar sadece kendi fotoğraflarını güncelleyebilir
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');
