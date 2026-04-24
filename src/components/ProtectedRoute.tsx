import { Navigate, Outlet } from 'react-router-dom';
import { hasAccess } from '@/lib/auth';

export default function ProtectedRoute() {
  if (!hasAccess()) {
    return <Navigate to="/connexion" replace />;
  }
  return <Outlet />;
}
