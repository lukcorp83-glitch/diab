// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyDYYDnRl9zIZmCySB6lk0yQweY6uosWuD4",
  authDomain: "diacontrolapp.firebaseapp.com",
  projectId: "diacontrolapp",
  storageBucket: "diacontrolapp.firebasestorage.app",
  messagingSenderId: "259157952763",
  appId: "1:259157952763:web:4ef74475f9042575ad885e"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-icon.svg'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
