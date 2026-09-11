/*
 * Challenger — service worker.
 *
 * It does two things and nothing else: show the notifications the server pushes,
 * and open the right page when one is tapped. There is deliberately no `fetch`
 * handler — the app has no offline mode, and an empty pass-through handler would
 * only cost a round trip through the worker on every request.
 *
 * Served from /sw.js (root scope, exempted in proxy.ts because the browser
 * fetches it without cookies). Plain ES2020, no imports, no build step: this
 * file is shipped exactly as written, and `public/**` is out of ESLint's reach.
 */

// A new version takes over at once rather than waiting for every tab to close:
// there is no cached state to keep consistent, so the newest worker always wins.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A message the server did not write, or a keep-alive: still show something
    // rather than nothing, because the permission promises a visible notification.
    payload = {};
  }

  const title = payload.title || "Challenger";
  const tag = payload.tag || undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: tag,
      // Without this, a replacement of an already-shown tag stays silent.
      renotify: !!tag,
      data: { url: payload.url || "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  const target = new URL(url, self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Reuse the app that is already open — on a phone, opening a second window
      // of an installed PWA is how you end up with two of them side by side.
      for (const client of clients) {
        if (new URL(client.url).origin !== target.origin) continue;
        return client.focus().then((focused) => {
          const window = focused || client;
          return window.navigate ? window.navigate(target.href) : undefined;
        });
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
