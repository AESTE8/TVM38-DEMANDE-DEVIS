import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================
// Activé uniquement en PRODUCTION pour éviter les problèmes en développement
// ============================================
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Enregistré avec succès:', registration.scope);

        // Écouter les mises à jour du service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Un nouveau SW est prêt : on peut demander à l'utilisateur de recharger
                console.log('[SW] Nouvelle version disponible, rechargement conseillé');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Erreur d\'enregistrement:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
