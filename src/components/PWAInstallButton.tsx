import { useEffect, useState, useRef } from 'react';
import { Download, X, Share2, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Détection iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Détection si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Écouteur pour Chrome/Edge (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      promptRef.current = event;
      setDeferredPrompt(event);
      setShowButton(true);
    };

    // Écouteur pour quand l'app est installée
    const handleAppInstalled = () => {
      setShowButton(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Pour iOS, on affiche toujours le bouton (sauf si déjà installé)
    if (isIOSDevice && !isInstalled) {
      setShowButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Edge : déclencher l'installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowButton(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // iOS ou autres navigateurs : afficher le guide
      setShowInstallGuide(true);
    }
  };

  const closeInstallGuide = () => setShowInstallGuide(false);

  if (!showButton || isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 text-primary font-headline font-bold py-2.5 px-6 rounded-sm uppercase tracking-tighter text-xs hover:bg-primary/20 transition-all"
      >
        <Download className="w-4 h-4" />
        Installer sur l'écran d'accueil
      </button>

      {/* Bottom Sheet pour iOS et autres navigateurs */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={closeInstallGuide}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />

          {/* Bottom Sheet Container */}
          <div
            className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 transition-transform animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle indicateur pour mobile */}
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Bouton fermer */}
            <button
              onClick={closeInstallGuide}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-headline uppercase tracking-tight">
                Installer l'application
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {isIOS ? 'Ajoutez TVM38 à votre écran d\'accueil' : 'Installez TVM38 sur votre appareil'}
              </p>
            </div>

            {/* Instructions iOS */}
            {isIOS && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-gray-900">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm mb-1">Touchez le bouton <strong>Partager</strong></p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Share2 className="w-4 h-4" />
                      <span>Icône avec la flèche vers le haut (↑)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-gray-900">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm mb-1">Faites défiler vers le bas</p>
                    <p className="text-xs text-gray-500">Trouvez <strong>"Ajouter à l'écran d'accueil"</strong></p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm mb-1">Touchez <strong>"Ajouter"</strong></p>
                    <p className="text-xs text-gray-500">L'icône TVM38 apparaîtra sur votre écran</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions Android/Firefox */}
            {!isIOS && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-gray-900">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Touchez le menu <strong>(⋮)</strong> du navigateur</p>
                    <p className="text-xs text-gray-500 mt-1">En haut ou en bas de l'écran</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-gray-900">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Touchez <strong>"Installer l'application"</strong></p>
                    <p className="text-xs text-gray-500 mt-1">Ou "Ajouter à l'écran d'accueil"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Avertissement Safari iOS */}
            {isIOS && (
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <Monitor className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Important :</strong> Sur iPhone, l'installation ne fonctionne qu'avec le navigateur <strong>Safari</strong>. Si vous êtes sur Chrome, ouvrez cette page dans Safari.
                  </p>
                </div>
              </div>
            )}

            {/* Bouton fermer */}
            <button
              onClick={closeInstallGuide}
              className="w-full mt-5 bg-gray-100 text-gray-700 font-headline font-bold py-3 rounded-xl uppercase tracking-tight text-sm hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
