import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PWAInstallButton from '@/components/PWAInstallButton';
import { setSession, setGuestMode, isSessionValid, ClientData } from '@/lib/auth';
import bgLogin from '@/assets/bg-login.jpg';
import { formatPhoneInput } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WEB3FORMS_KEY = '6b3c4c9e-c46d-4e6c-beaf-06ede9b43b96';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isSessionValid()) navigate('/espace', { replace: true });
  }, []);
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
          setError('Votre compte est suspendu. Contactez TVM38 au 04 76 XX XX XX ou par email.');
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
      const body = new FormData();
      body.append('access_key', WEB3FORMS_KEY);
      body.append('subject', 'Demande d\'ouverture de compte TVM38');
      body.append('from_name', accountForm.nom);
      body.append('message', `Demande d'ouverture de compte\n\nNom : ${accountForm.nom}\nEmail : ${accountForm.email}\nTéléphone : ${accountForm.telephone}\nEntreprise : ${accountForm.entreprise}`);
      body.append('email', accountForm.email);

      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body });
      if (res.ok) {
        setAccountRequestSent(true);
      } else {
        toast.error('Envoi échoué. Réessayez ou contactez-nous directement.');
      }
    } catch {
      toast.error('Impossible d\'envoyer la demande. Vérifiez votre connexion.');
    } finally {
      setAccountLoading(false);
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `linear-gradient(160deg, rgba(0, 83, 161, 0.18) 0%, rgba(0, 83, 161, 0.06) 100%), url(${bgLogin})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-md">

          {/* Titre & Logo */}
          <div className="text-center mb-6 animate-slide-up">
            <img src="/logo-tvm38.png" alt="TVM38 Logo" className="h-20 md:h-28 mx-auto mb-4 object-contain transition-transform duration-300 hover:scale-105" />
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase font-headline drop-shadow-md">
              Votre devis granulats en 3 minutes
            </h1>
          </div>

          {/* Preuve sociale avec Glassmorphism */}
          <div className="flex items-center justify-center gap-6 mb-6 py-4 px-6 rounded-xl shadow-xl backdrop-blur-lg border border-white/20 bg-primary/70 transition-all hover:bg-primary/80">
            <div className="text-center">
              <p className="text-2xl font-black text-white font-headline leading-none drop-shadow">350+</p>
              <p className="text-[11px] font-bold text-white/90 font-body mt-1 leading-tight">professionnels<br/>du BTP</p>
            </div>
            <div className="w-px h-9 bg-white/25" />
            <div className="text-center">
              <p className="text-2xl font-black text-white font-headline leading-none drop-shadow">{new Date().getFullYear() - 1937}</p>
              <p className="text-[11px] font-bold text-white/90 font-body mt-1 leading-tight">ans<br/>d'expertise</p>
            </div>
          </div>

          {/* Carte login */}
          <div className="bg-white/95 backdrop-blur-md border border-white/40 rounded-xl shadow-2xl p-6 md:p-8 transition-all">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Identifiant */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary font-headline flex items-center justify-between">
                  <span>Identifiant client</span>
                  <span className="text-[10px] text-secondary/60 font-normal">Ex: CTVM01</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                  <input
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
                <label className="text-xs font-bold uppercase tracking-wider text-secondary font-headline">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                  <input
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-secondary/60 hover:text-primary transition-colors rounded-md focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3.5 text-sm text-destructive font-semibold font-body animate-shake">
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
                  className="text-xs text-primary hover:underline font-semibold font-body transition-colors"
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
                  <span className="text-base font-normal">→</span>
                </button>
                <p className="text-center text-[11px] font-semibold text-secondary/70 font-body">
                  ⚡ Pour particuliers & professionnels sans identifiant
                </p>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAccountRequest(true)}
                    className="text-xs font-bold text-primary hover:underline font-body transition-colors"
                  >
                    Pas encore client TVM ? Demander l'ouverture d'un compte →
                  </button>
                </div>
                <div className="pt-2">
                  <PWAInstallButton />
                </div>
              </div>
            ) : accountRequestSent ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                <p className="text-sm font-bold text-on-surface font-headline">Demande envoyée avec succès !</p>
                <p className="text-xs text-secondary font-body">Notre équipe commerciale vous contactera très rapidement.</p>
                <button
                  type="button"
                  onClick={() => { setShowAccountRequest(false); setAccountRequestSent(false); }}
                  className="text-xs text-primary font-bold hover:underline font-body mt-2 inline-block"
                >
                  ← Retour à la connexion
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
                    <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                      {label}{required && ' *'}
                    </label>
                    <input
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
                  ← Retour
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
