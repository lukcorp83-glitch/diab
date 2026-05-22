importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  
  if (notification.tag === 'persistent-stats-widget') {
    notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/diab/');
        }
      })
    );
  }
});
firebase.initializeApp({
  apiKey: "AIzaSyDYYDnRl9zIZmCySB6lk0yQweY6uosWuD4",
  authDomain: "diacontrolapp.firebaseapp.com",
  projectId: "diacontrolapp",
  storageBucket: "diacontrolapp.firebasestorage.app",
  messagingSenderId: "259157952763",
  appId: "1:259157952763:web:4ef74475f9042575ad885e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'pwa-icon.svg' // Path relative to service worker location
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
