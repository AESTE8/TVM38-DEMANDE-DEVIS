import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

const FormPage = lazy(() => import('@/pages/FormPage'));
const SuccessPage = lazy(() => import('@/pages/SuccessPage'));
const EstimationPage = lazy(() => import('@/pages/EstimationPage'));
const CredentialsContactPage = lazy(() => import('@/pages/CredentialsContactPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Page de connexion — racine du site */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/connexion" element={<Navigate to="/" replace />} />
          <Route path="/identifiants-oublies" element={<CredentialsContactPage />} />
          <Route path="/estimation" element={<EstimationPage />} />

          {/* Pages protégées (session client ou mode guest) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/formulaire" element={<FormPage />} />
            <Route path="/merci" element={<SuccessPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster richColors position="top-center" />
      <Analytics />
    </BrowserRouter>
  );
}
