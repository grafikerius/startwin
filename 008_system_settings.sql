-- 1. Create the system_settings table (Only 1 row will exist)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY DEFAULT 1,
    banner_enabled boolean DEFAULT false,
    banner_image_url text DEFAULT '',
    banner_link text DEFAULT '',
    interstitial_enabled boolean DEFAULT false,
    interstitial_image_url text DEFAULT '',
    interstitial_link text DEFAULT '',
    interstitial_duration_seconds integer DEFAULT 3,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Allow public to READ the settings (so the frontend can display ads)
CREATE POLICY "Public can read system_settings" ON public.system_settings
    FOR SELECT TO public USING (true);

-- 3. Insert default row if not exists
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 4. RPC to get system settings
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS json AS $$
DECLARE
    res json;
BEGIN
    SELECT row_to_json(s) INTO res FROM public.system_settings s WHERE id = 1;
    RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC to update system settings (Protected by master password)
CREATE OR REPLACE FUNCTION update_system_settings(
    p_password text,
    p_banner_enabled boolean,
    p_banner_image_url text,
    p_banner_link text,
    p_interstitial_enabled boolean,
    p_interstitial_image_url text,
    p_interstitial_link text,
    p_interstitial_duration integer
)
RETURNS boolean AS $$
DECLARE
    v_real_password text;
BEGIN
    SELECT value INTO v_real_password FROM public.admin_settings WHERE key = 'admin_password';
    IF v_real_password IS NULL OR v_real_password != p_password THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Şifre hatalı';
    END IF;

    UPDATE public.system_settings SET
        banner_enabled = p_banner_enabled,
        banner_image_url = p_banner_image_url,
        banner_link = p_banner_link,
        interstitial_enabled = p_interstitial_enabled,
        interstitial_image_url = p_interstitial_image_url,
        interstitial_link = p_interstitial_link,
        interstitial_duration_seconds = p_interstitial_duration
    WHERE id = 1;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
