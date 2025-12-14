// RedPay Push Notification Service Worker
// Handles background push notifications with link support

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.log('Could not parse push data:', e);
    data = { notification: { title: 'RedPay', body: event.data?.text() || '' } };
  }

  const title = data.notification?.title || 'RedPay Notification';
  const options = {
    body: data.notification?.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    image: data.notification?.image || undefined,
    data: {
      url: data.data?.cta_url || data.data?.link || data.notification?.click_action || '/',
      notification_id: data.data?.notification_id || null,
      ...data.data
    },
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: data.data?.cta_url || data.data?.link ? [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ] : []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/dashboard';
  const fullUrl = urlToOpen.startsWith('http') 
    ? urlToOpen 
    : `https://www.redpay.com.co${urlToOpen}`;
  
  console.log('Opening URL:', fullUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes('redpay') && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: urlToOpen });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
