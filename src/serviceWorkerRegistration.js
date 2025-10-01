// src/serviceWorkerRegistration.js

// Register a service worker only in production builds.
// In `npm start` (development), this does nothing — no errors.
export function register() {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const swUrl = '/service-worker.js';
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl).catch((err) => {
        // Fail silently in production; you can console.log(err) for debugging
      });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
