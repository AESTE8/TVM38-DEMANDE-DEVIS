import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FormPage from '@/pages/FormPage';
import SuccessPage from '@/pages/SuccessPage';
import EstimationPage from '@/pages/EstimationPage';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/merci" element={<SuccessPage />} />
        <Route path="/estimation" element={<EstimationPage />} />
      </Routes>
      <Toaster richColors position="top-center" />
      <Analytics />
    </BrowserRouter>
  );
}
