import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserCheck } from 'lucide-react';
import { clearSession, getConnectedClient } from '@/lib/auth';

export default function ClientBadge() {
  const navigate = useNavigate();
  const client = getConnectedClient();

  if (!client) return null;

  function handleLogout() {
    clearSession();
    navigate('/connexion', { replace: true });
  }

  const displayName = client.type === 'professionnel'
    ? client.nom
    : `${client.prenom ?? ''} ${client.nom}`.trim();

  return (
    <div className="flex min-h-12 items-center gap-1 rounded-lg border border-white/20 bg-white/10 pl-1 pr-0.5 text-sm shadow-sm backdrop-blur-sm sm:pl-2 sm:pr-1">
      {/* Le badge est le point d'entrée vers l'espace personnel depuis n'importe
          quelle page — notamment depuis le formulaire. */}
      <Link
        to="/espace"
        title="Accéder à mon espace"
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-1.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:justify-start"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/15">
          <UserCheck aria-hidden="true" className="h-4 w-4 text-white" />
        </span>
        <div className="hidden sm:flex flex-col min-w-0">
          <span className="max-w-[150px] truncate font-headline text-xs font-bold text-white">
            {displayName}
          </span>
          <span className="text-[10px] font-medium text-white/65">
            Espace client · {client.code}
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        title="Se déconnecter"
        aria-label="Se déconnecter"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md p-0 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
