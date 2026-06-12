import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(envFile.split('\n').map(line => line.split('=')));

const supabaseUrl = envVars.VITE_SUPABASE_URL.trim();
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const spec = await res.json();
  console.log('Tables:', Object.keys(spec.definitions || {}));
}

run();
