self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'StarTwin';
  const options = {
    body: data.body || 'Yeni bir kozmik mesajınız var!',
    icon: '/icon512_maskable.png',
    badge: '/icon512_rounded.png',
    data: data.url || '/',
    vibrate: [200, 100, 200, 100, 200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Bildirime tıklandığında uygulamayı aç/odaklan
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      const url = event.notification.data || '/';
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(url) && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow(url);
    })
  );
});
