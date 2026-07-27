import { Navigate, Outlet } from 'react-router-dom';
import { hasAccess, isSessionValid } from '@/lib/auth';

interface ProtectedRouteProps {
  /**
   * Réserve la route aux clients réellement connectés.
   * Le formulaire reste accessible en mode invité, mais l'espace personnel
   * suppose un compte : sans session il n'y a pas de client à qui rattacher
   * des demandes ni de devis à afficher.
   */
  sessionRequise?: boolean;
}

export default function ProtectedRoute({ sessionRequise = false }: ProtectedRouteProps) {
  const autorise = sessionRequise ? isSessionValid() : hasAccess();

  if (!autorise) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
