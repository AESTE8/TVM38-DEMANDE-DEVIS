import { useEffect, useRef, useState } from 'react';
import '@khmyznikov/pwa-install';
import type { PWAInstallElement } from '@khmyznikov/pwa-install';
import { Download } from 'lucide-react';

export default function PWAInstallButton() {
  const pwaRef = useRef<PWAInstallElement>(null);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    const el = pwaRef.current;
    if (!el) return;

    const onInstalled = () => setIsInstalled(true);
    el.addEventListener('pwa-install-success-event', onInstalled);
    return () => el.removeEventListener('pwa-install-success-event', onInstalled);
  }, []);

  if (isInstalled) return null;

  return (
    <>
      <pwa-install
        ref={pwaRef}
        manifestUrl="/manifest.json"
        name="TVM38"
        description="Devis & Estimation - MIDALI"
        icon="/android/launchericon-192x192.png"
        styles={{ '--tint-color': '#2c64a3' }}
        manualApple
        manualChrome
      />
      <button
        type="button"
        onClick={() => pwaRef.current?.showDialog(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-6 py-2.5 font-headline text-xs font-bold text-primary transition hover:bg-primary/10 active:scale-[0.98]"
      >
        <Download className="w-4 h-4" />
        Installer l'application
      </button>
    </>
  );
}
