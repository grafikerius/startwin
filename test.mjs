import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read from .env
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('messages').select('message_text, sender_id').order('created_at', { ascending: false }).limit(10);
  console.log(data);
}
run();
