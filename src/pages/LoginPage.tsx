import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PWAInstallButton from '@/components/PWAInstallButton';
import { setSession, setGuestMode, isSessionValid, ClientData } from '@/lib/auth';
import bgLogin from '@/assets/bg-login.jpg';
import { formatPhoneInput } from '@/lib/utils';
import { envoyerMessageContact } from '@/lib/contact';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isSessionValid()) navigate('/espace', { replace: true });
  }, [navigate]);
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccountRequest, setShowAccountRequest] = useState(false);
  const [accountRequestSent, setAccountRequestSent] = useState(false);
  const [accountForm, setAccountForm] = useState({ nom: '', email: '', telephone: '', entreprise: '' });
  const [accountLoading, setAccountLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!SUPABASE_URL) {
      setError('Le service de connexion est indisponible. Contactez TVM38 si le problème persiste.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant: identifiant.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'ACCOUNT_SUSPENDED') {
          setError('Votre compte est suspendu. Contactez TVM38 à tvm38@midali.fr.');
        } else {
          setError('Identifiant ou mot de passe incorrect.');
        }
        return;
      }

      setSession(data.client as ClientData, data.token as string, data.expiresAt as number);
      navigate('/espace', { replace: true });
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    setGuestMode();
    navigate('/formulaire', { replace: true });
  }

  async function handleAccountRequest(e: React.FormEvent) {
    e.preventDefault();
    setAccountLoading(true);
    try {
      await envoyerMessageContact({
        type: 'ouverture_compte',
        nom: accountForm.nom,
        email: accountForm.email,
        telephone: accountForm.telephone,
        entreprise: accountForm.entreprise,
        message: "Demande d'ouverture de compte depuis la page de connexion.",
      });
      setAccountRequestSent(true);
    } catch {
      toast.error('Impossible d\'envoyer la demande. Vérifiez votre connexion.');
    } finally {
      setAccountLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      {/* Le fond était posé sur ce conteneur avec `background-attachment: fixed`,
          que Safari iOS ne gère pas : l'image était recadrée en plein zoom et
          sautait au défilement. On le remplace par un calque fixe dédié, qui
          donne le même rendu sur tous les navigateurs. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(0, 83, 161, 0.18) 0%, rgba(0, 83, 161, 0.06) 100%), url(${bgLogin})`,
        }}
      />

      <Header showSecondaryAction={false} showPrimaryAction={false} />

      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-10 sm:pt-28 sm:pb-12">
        <div className="w-full max-w-md">

          {/* Titre & Logo */}
          <div className="text-center mb-4 sm:mb-6 animate-slide-up">
            <img src="/logo-tvm38.png" alt="TVM38" className="mx-auto mb-3 h-14 object-contain sm:mb-4 sm:h-20 md:h-28" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-white uppercase font-headline drop-shadow-md">
              Demandez votre devis granulats
            </h1>
          </div>

          {/* Carte login */}
          <div className="bg-white/95 backdrop-blur-md border border-white/40 rounded-xl shadow-2xl p-5 sm:p-6 md:p-8 transition-all">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              {/* Identifiant */}
              <div className="space-y-1.5">
                <label htmlFor="login-identifiant" className="text-xs font-bold uppercase tracking-wider text-secondary font-headline flex items-center justify-between">
                  <span>Identifiant client</span>
                  <span className="text-[10px] text-secondary/60 font-normal">Indiqué par TVM38</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                  <input
                    id="login-identifiant"
                    type="text"
                    value={identifiant}
                    onChange={e => { setIdentifiant(e.target.value); setError(null); }}
                    placeholder="Saisissez votre identifiant"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-border/80 rounded-lg text-sm font-body text-on-surface bg-surface min-h-[44px] placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-secondary font-headline">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 py-3 border border-border/80 rounded-lg text-sm font-body text-on-surface bg-surface min-h-[44px] placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-secondary/60 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div role="alert" aria-live="assertive" className="bg-destructive/10 border border-destructive/30 rounded-lg p-3.5 text-sm text-destructive font-semibold font-body animate-shake">
                  {error}
                </div>
              )}

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold py-3.5 px-6 rounded-lg uppercase tracking-tight text-sm shadow-xl shadow-red-900/20 hover:brightness-110 active:scale-[0.98] transition-all min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>

              {/* Lien identifiants oubliés */}
              <div className="text-center pt-1">
                <Link
                  to="/identifiants-oublies"
                  className="inline-flex min-h-11 items-center px-2 text-xs text-primary hover:underline font-semibold font-body transition-colors"
                >
                  Identifiants inconnus ou oubliés ?
                </Link>
              </div>
            </form>

            {/* Séparateur */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-xs font-bold uppercase tracking-widest text-secondary/60 font-body">ou</span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {/* Section sans compte */}
            {!showAccountRequest ? (
              <div className="space-y-3.5">
                <button
                  type="button"
                  onClick={handleGuest}
                  className="w-full bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary font-headline font-extrabold py-3 px-6 rounded-lg uppercase tracking-tight text-xs active:scale-[0.98] transition-all min-h-[46px] flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Continuer sans compte</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
                <p className="text-center text-[11px] font-semibold text-secondary/70 font-body">
                  Pour particuliers & professionnels sans identifiant
                </p>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAccountRequest(true)}
                    className="text-xs font-bold text-primary hover:underline font-body transition-colors"
                  >
                    Pas encore client TVM ? Demander l'ouverture d'un compte
                  </button>
                </div>
                <div className="pt-2">
                  <PWAInstallButton />
                </div>
              </div>
            ) : accountRequestSent ? (
              <div className="text-center py-4 space-y-2">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-on-surface font-headline">Demande envoyée avec succès !</p>
                <p className="text-xs text-secondary font-body">Votre demande a été transmise à l'équipe TVM38.</p>
                <button
                  type="button"
                  onClick={() => { setShowAccountRequest(false); setAccountRequestSent(false); }}
                  className="text-xs text-primary font-bold hover:underline font-body mt-2 inline-block"
                >
                  <ArrowLeft aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccountRequest} className="space-y-4">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest font-headline">
                  Demande d'ouverture de compte
                </p>
                {[
                  { key: 'nom', label: 'Nom complet', placeholder: 'Jean Dupont', required: true },
                  { key: 'email', label: 'Email', placeholder: 'jean.dupont@entreprise.fr', required: true },
                  { key: 'telephone', label: 'Téléphone', placeholder: '06 12 34 56 78', required: false },
                  { key: 'entreprise', label: 'Entreprise', placeholder: 'Dupont SARL', required: false },
                ].map(({ key, label, placeholder, required }) => (
                  <div key={key} className="space-y-1">
                    <label htmlFor={`account-${key}`} className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                      {label}{required && ' *'}
                    </label>
                    <input
                      id={`account-${key}`}
                      type={key === 'email' ? 'email' : 'text'}
                      value={accountForm[key as keyof typeof accountForm]}
                      onChange={e => setAccountForm(f => ({ ...f, [key]: key === 'telephone' ? formatPhoneInput(e.target.value) : e.target.value }))}
                      placeholder={placeholder}
                      required={required}
                      className="w-full px-3 py-2.5 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={accountLoading}
                  className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold py-3 px-6 rounded-sm uppercase tracking-tighter text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {accountLoading ? 'Envoi...' : 'Envoyer la demande'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountRequest(false)}
                  className="w-full text-secondary/70 font-body text-xs py-1 hover:text-secondary transition-colors"
                >
                  <ArrowLeft aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                  Retour
                </button>
              </form>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
