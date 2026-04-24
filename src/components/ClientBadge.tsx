import { useNavigate } from 'react-router-dom';
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
    <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-sm px-3 py-2 text-sm">
      <UserCheck className="w-4 h-4 text-primary shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-on-surface text-xs font-headline truncate max-w-[160px]">
          {displayName}
        </span>
        <span className="text-secondary/70 text-[10px] font-body">
          {client.code}
        </span>
      </div>
      <button
        onClick={handleLogout}
        title="Se déconnecter"
        className="ml-1 text-secondary/60 hover:text-destructive transition-colors shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
