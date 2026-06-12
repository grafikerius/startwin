import { useEffect, useState } from 'react';
import StarTwin from './components/StarTwin';
import { CELEBRITIES } from './data';
import { fetchCelebrities } from './lib/supabase';
import type { Celebrity } from './lib/match';

// Starts instantly with the bundled dataset (no blank screen), then upgrades to
// live Supabase data if it's configured and returns rows.
export default function App() {
  const [celebs, setCelebs] = useState<Celebrity[]>(CELEBRITIES);

  useEffect(() => {
    let cancelled = false;
    fetchCelebrities().then((rows) => {
      if (!cancelled && rows && rows.length) setCelebs(rows);
    });
    return () => { cancelled = true; };
  }, []);

  return <StarTwin celebrities={celebs} />;
}
