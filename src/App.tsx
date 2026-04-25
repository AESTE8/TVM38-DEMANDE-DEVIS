import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FormPage from '@/pages/FormPage';
import SuccessPage from '@/pages/SuccessPage';
import EstimationPage from '@/pages/EstimationPage';
import LoginPage from '@/pages/LoginPage';
import CredentialsContactPage from '@/pages/CredentialsContactPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <BrowserRouter>
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
      <Toaster richColors position="top-center" />
      <Analytics />
    </BrowserRouter>
  );
}
