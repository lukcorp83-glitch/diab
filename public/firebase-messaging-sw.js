importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// This will be replaced or you can hardcode your config here if needed, 
// but Firebase usually handles the initialization of the SW if it's in the root.
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
    icon: '/logo192.png' // Make sure this exists or use a generic one
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
