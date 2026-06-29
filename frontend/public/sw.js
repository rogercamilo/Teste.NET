self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { titulo: "Formattio", corpo: event.data.text() };
  }

  const title = data.titulo ?? "Formattio";
  const options = {
    body: data.corpo ?? "",
    icon: data.icon ?? "/push-icon-192.png",
    badge: data.badge ?? "/push-badge-96.png",
    data: { url: data.url ?? "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path = event.notification.data?.url ?? "/";
  // Defesa contra open-redirect: só navega para a própria origem. URL absoluta
  // externa (ex.: vinda de um payload malicioso) cai na raiz da aplicação.
  let resolved;
  try {
    resolved = new URL(path, self.location.origin);
  } catch {
    resolved = new URL("/", self.location.origin);
  }
  const targetUrl =
    resolved.origin === self.location.origin ? resolved.href : new URL("/", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url === targetUrl && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })
  );
});
