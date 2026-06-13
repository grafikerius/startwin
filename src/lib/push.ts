const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BAEX0MidCg9JhtlutTENYbBl1-uc4WA_ruX55ZA_YdUQQ-72RzjntrE-SVWhXZizMbIi-kS1K6XJyxr87mdx-84';

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications(supabase: any, userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false; // Push not supported
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const applicationServerKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
    }

    const p256dh = subscription.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh') as ArrayBuffer)))) : '';
    const auth = subscription.getKey('auth') ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth') as ArrayBuffer)))) : '';

    // Save to Supabase
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: p256dh,
      auth: auth
    }, { onConflict: 'endpoint' });

    return true;
  } catch (err) {
    console.error('Push subscription error:', err);
    return false;
  }
}
