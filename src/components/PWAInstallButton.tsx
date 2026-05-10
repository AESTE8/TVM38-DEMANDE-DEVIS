import { useEffect, useRef, useState } from 'react';
import '@khmyznikov/pwa-install';
import type { PWAInstallElement } from '@khmyznikov/pwa-install';
import { Download } from 'lucide-react';

export default function PWAInstallButton() {
  const pwaRef = useRef<PWAInstallElement>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

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
      />
      <button
        type="button"
        onClick={() => pwaRef.current?.showDialog(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 text-primary font-headline font-bold py-2.5 px-6 rounded-sm uppercase tracking-tighter text-xs hover:bg-primary/20 transition-all"
      >
        <Download className="w-4 h-4" />
        Installer en tant qu'application
      </button>
    </>
  );
}
