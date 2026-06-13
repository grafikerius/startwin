import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID keys setup
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY || 'BAEX0MidCg9JhtlutTENYbBl1-uc4WA_ruX55ZA_YdUQQ-72RzjntrE-SVWhXZizMbIi-kS1K6XJyxr87mdx-84';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'Bb8mmbTdcGCxc6oDW9Cv6qtvsTUTPG6xmtoyk0Zcu7w';

webpush.setVapidDetails(
  'mailto:support@startwin.app',
  publicVapidKey,
  privateVapidKey
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId, title, body, url } = payload;

    if (!userId || !title) {
      return res.status(400).json({ error: 'UserId and title are required' });
    }

    // Get the user's push subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No subscriptions found for user' });
    }

    const pushPayload = JSON.stringify({ title, body, url });
    
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
        return { success: true };
      } catch (err: any) {
        // If the subscription is gone/unsubscribed, remove it from the DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        return { success: false, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    console.error('Push API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
