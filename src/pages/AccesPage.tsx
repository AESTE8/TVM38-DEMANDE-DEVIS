import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { setSession, type ClientData } from '@/lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Destinations que les e-mails savent demander (`&vers=…`).
 *
 * Le logiciel envoie un mot-clé, pas un chemin : le site reste libre de ses
 * routes. Un mot-clé inconnu n'est pas une erreur — il retombe sur l'espace,
 * pour qu'un e-mail parti avant une évolution du site n'ouvre jamais une 404.
 */
const DESTINATIONS: Record<string, string> = {
  dossiers: '/espace',
  'nouvelle-demande': '/formulaire',
};

/**
 * Connexion depuis un lien d'e-mail.
 *
 * Le lien porte un jeton signé, jamais le mot de passe du client : une adresse
 * web se retrouve dans l'historique du navigateur, les logs serveur, l'en-tête
 * Referer et les aperçus de lien des messageries, et un e-mail se transfère.
 *
 * Le jeton est échangé ici contre une session ordinaire, puis retiré de la barre
 * d'adresse pour qu'il ne traîne pas dans l'historique du poste.
 */
export default function AccesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [erreur, setErreur] = useState<string | null>(null);
  // React monte deux fois en développement : sans ce garde, le jeton serait
  // échangé deux fois et la seconde réponse écraserait la première session.
  const dejaTente = useRef(false);

  useEffect(() => {
    if (dejaTente.current) return;
    dejaTente.current = true;

    const jeton = searchParams.get('t');
    if (!jeton) {
      setErreur('Ce lien est incomplet.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-client`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accesToken: jeton }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErreur(data.error === 'ACCOUNT_SUSPENDED'
            ? 'Votre accès est momentanément suspendu. Contactez TVM38.'
            : 'Ce lien a expiré ou n’est plus valable. Connectez-vous avec vos identifiants.');
          return;
        }

        setSession(data.client as ClientData, data.token as string, data.expiresAt as number);
        // `vers` l'emporte sur l'affaire du jeton : il n'est posé que sur les
        // liens secondaires (« tous mes dossiers », « faire une demande »), où
        // le client demande explicitement autre chose que le dossier concerné.
        const vers = searchParams.get('vers');
        const destination = (vers && DESTINATIONS[vers])
          || (typeof data.affaire === 'string' && data.affaire
            ? `/espace/${encodeURIComponent(data.affaire)}`
            : '/espace');
        // `replace` : le jeton disparaît de l'historique du navigateur.
        navigate(destination, { replace: true });
      } catch {
        setErreur('La connexion a échoué. Vérifiez votre réseau et réessayez.');
      }
    })();
  }, [navigate, searchParams]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {erreur ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-headline text-lg font-black text-on-surface">Lien inutilisable</h1>
            <p className="mt-2 text-sm text-secondary">{erreur}</p>
            <Link
              to="/"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-white"
            >
              Aller à la page de connexion
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 font-headline text-lg font-black text-on-surface">Connexion en cours</h1>
            <p className="mt-2 text-sm text-secondary">Nous ouvrons votre espace client…</p>
          </>
        )}
      </div>
    </main>
  );
}
