import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingScreen from '@/components/ui/LoadingScreen';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import ServiceConfigGuard from '@/components/ServiceConfigGuard';
import { Toaster } from 'sonner';

const FormPage = lazy(() => import('@/pages/FormPage'));
const SuccessPage = lazy(() => import('@/pages/SuccessPage'));
const EstimationPage = lazy(() => import('@/pages/EstimationPage'));
const CredentialsContactPage = lazy(() => import('@/pages/CredentialsContactPage'));
const AccesPage = lazy(() => import('@/pages/AccesPage'));
const EspacePage = lazy(() => import('@/pages/EspacePage'));
const AffairePage = lazy(() => import('@/pages/AffairePage'));
const ProfilPage = lazy(() => import('@/pages/ProfilPage'));
const MentionsLegalesPage = lazy(() => import('@/pages/legal/MentionsLegalesPage'));
const ConfidentialitePage = lazy(() => import('@/pages/legal/ConfidentialitePage'));
const CGUPage = lazy(() => import('@/pages/legal/CGUPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/connexion" element={<Navigate to="/" replace />} />
            <Route path="/identifiants-oublies" element={<CredentialsContactPage />} />
            <Route path="/estimation" element={<EstimationPage />} />

            {/* Pages légales : accessibles sans compte et sans configuration
                serveur, y compris si le service est indisponible. */}
            <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
            <Route path="/confidentialite" element={<ConfidentialitePage />} />
            <Route path="/cgu" element={<CGUPage />} />

            <Route element={<ServiceConfigGuard />}>
              <Route path="/acces" element={<AccesPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/formulaire" element={<FormPage />} />
                <Route path="/merci" element={<SuccessPage />} />
              </Route>

              <Route element={<ProtectedRoute sessionRequise />}>
                <Route path="/espace" element={<EspacePage />} />
                <Route path="/espace/profil" element={<ProfilPage />} />
                <Route path="/espace/:id" element={<AffairePage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}
