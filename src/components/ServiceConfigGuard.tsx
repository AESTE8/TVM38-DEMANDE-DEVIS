import { AlertTriangle, Mail } from 'lucide-react';
import { Outlet } from 'react-router-dom';

const serviceConfigure = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function ServiceConfigGuard() {
  if (serviceConfigure) return <Outlet />;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-[0_18px_55px_rgba(0,83,161,0.10)] sm:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
          <AlertTriangle aria-hidden="true" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-headline text-2xl font-black tracking-tight text-on-surface">Service temporairement indisponible</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-secondary">
          La demande ne peut pas être ouverte pour le moment. Revenez à l'accueil ou contactez TVM38.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">Retour à l'accueil</a>
          <a href="mailto:tvm38@midali.fr" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-primary hover:border-primary/40">
            <Mail aria-hidden="true" className="h-4 w-4" />
            Contacter TVM38
          </a>
        </div>
      </section>
    </main>
  );
}
