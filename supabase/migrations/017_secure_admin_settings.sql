-- Enable Row Level Security on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might allow public access
DROP POLICY IF EXISTS "Public can read admin_settings" ON public.admin_settings;

-- We explicitly do NOT create any SELECT policy for public/anon.
-- This means that by default, NO user from the frontend can read the admin_password.
-- Only database functions with SECURITY DEFINER (like get_admin_stats and update_system_settings)
-- will be able to bypass RLS and verify the password internally.
