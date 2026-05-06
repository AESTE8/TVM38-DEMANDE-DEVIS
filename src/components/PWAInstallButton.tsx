import { useEffect, useState, useRef } from 'react';
import { Download, X, Share2, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Détection iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isIOSChrome = /CriOS/i.test(navigator.userAgent) && isIOSDevice;
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
    } else if (isIOS) {
      // iOS : afficher le guide
      setShowIOSGuide(true);
    }
  };

  const closeIOSGuide = () => setShowIOSGuide(false);

  if (!showButton || isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 text-primary font-headline font-bold py-2.5 px-6 rounded-sm uppercase tracking-tighter text-xs hover:bg-primary/20 transition-all"
      >
        <Download className="w-4 h-4" />
        Installer l'application
      </button>

      {/* Guide iOS */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeIOSGuide}>
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeIOSGuide}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-headline uppercase tracking-tight">
                Installer sur iPhone
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Ajoutez TVM38 à votre écran d'accueil
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Touchez le bouton <strong>Partager</strong></p>
                  <p className="text-xs text-gray-500 mt-1">C'est l'icône avec la flèche vers le haut (↑)</p>
                </div>
                <Share2 className="w-6 h-6 text-blue-500 shrink-0" />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Faites défiler vers le bas</p>
                  <p className="text-xs text-gray-500 mt-1">Trouvez l'option <strong>"Ajouter à l'écran d'accueil"</strong></p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Touchez <strong>"Ajouter"</strong></p>
                  <p className="text-xs text-gray-500 mt-1">L'icône TVM38 apparaîtra sur votre écran d'accueil</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <Monitor className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>Important :</strong> Sur iPhone, l'installation ne fonctionne qu'avec le navigateur <strong>Safari</strong>. Si vous êtes sur Chrome, ouvrez cette page dans Safari.
                </p>
              </div>
            </div>

            <button
              onClick={closeIOSGuide}
              className="w-full mt-4 bg-primary text-white font-headline font-bold py-3 rounded-sm uppercase tracking-tighter text-sm hover:bg-primary/90 transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
