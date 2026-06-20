self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Heimdall provider alert';
  const options = {
    body: payload.body || 'Provider exposure changed. Review Heimdall for source context.',
    icon: payload.icon || '/heimdall-icon.svg',
    badge: payload.badge || '/heimdall-icon.svg',
    tag: payload.tag || 'heimdall-provider-alert',
    data: {
      url: payload.url || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/dashboard';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const targetUrl = new URL(url, self.location.origin).href;

    for (const client of allClients) {
      if ('focus' in client && client.url === targetUrl) {
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }

    return undefined;
  })());
});
