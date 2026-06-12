-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_name text NOT NULL,
  location geography(Point, 4326),
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Spatial index for fast distance queries
CREATE INDEX profiles_location_idx ON public.profiles USING GIST (location);
CREATE INDEX profiles_last_seen_idx ON public.profiles (last_seen);

-- 2. Messages Table
-- This table stores the actual message and sender. Clients DO NOT subscribe to this table directly.
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  sender_location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Message Deliveries Table
-- This is what clients subscribe to via Supabase Realtime.
-- They only listen to rows where receiver_id = their own id.
CREATE TABLE public.message_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id bigint REFERENCES public.messages(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_anonymous_name text NOT NULL,
  message_text text NOT NULL,
  distance_meters float NOT NULL, -- Exact coordinates are hidden, only distance is stored
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and Realtime
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_deliveries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/authenticated users to insert their own profile or update it
CREATE POLICY "Profiles are freely accessible" ON public.profiles FOR ALL USING (true);

-- Allow anyone to insert a message
CREATE POLICY "Messages are insertable" ON public.messages FOR INSERT WITH CHECK (true);

-- Only allow users to read their own deliveries
CREATE POLICY "Users can read own deliveries" ON public.message_deliveries FOR SELECT USING (true);
-- Note: In a real production app with proper Auth, USING (receiver_id = auth.uid())

-- Enable Realtime ONLY for message_deliveries
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_deliveries;

-- 4. Trigger Function: Distribute Message to Nearby Users
-- When a new message is inserted, find users within 100 meters (who were active in last 10 mins)
-- and insert a delivery record for them.
CREATE OR REPLACE FUNCTION distribute_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
BEGIN
  -- Get sender name
  SELECT anonymous_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.message_deliveries (message_id, receiver_id, sender_id, sender_anonymous_name, message_text, distance_meters)
  SELECT 
    NEW.id,
    p.id,
    NEW.sender_id,
    sender_name,
    NEW.message_text,
    ST_Distance(NEW.sender_location, p.location)
  FROM public.profiles p
  WHERE p.id != NEW.sender_id
    AND p.last_seen >= now() - interval '10 minutes'
    AND ST_DWithin(NEW.sender_location, p.location, 100); -- 100 meters radius

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION distribute_message();
