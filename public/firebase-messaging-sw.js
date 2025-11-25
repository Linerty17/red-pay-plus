// RedPay Push Notification Service Worker
// This service worker handles background push notifications
// No Firebase SDK initialization needed - uses native Push API

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.notification?.title || 'RedPay Notification';
  const options = {
    body: data.notification?.body || '',
    icon: data.notification?.image || '/favicon.png',
    badge: '/favicon.png',
    data: data.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Open the URL from notification data or default to home
  const urlToOpen = event.notification.data?.link || event.notification.data?.cta_url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open with this URL
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});