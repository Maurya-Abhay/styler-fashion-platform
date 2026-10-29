self.addEventListener("push", event => {
  let payload = { title: "Styler", body: "You have a new update.", url: "/customer/notifications" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title || "Styler", {
    body: payload.body || payload.message || "You have a new update.",
    icon: "/styler-icon.svg", badge: "/styler-icon.svg", data: { url: payload.url || "/customer/notifications" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/customer/notifications", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
