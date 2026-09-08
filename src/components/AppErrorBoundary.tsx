import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[TVM38] Erreur de rendu', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-12">
        <section className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-[0_18px_55px_rgba(0,83,161,0.10)] sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-headline text-2xl font-black tracking-tight text-on-surface">
            Cette page ne peut pas s'afficher
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-secondary">
            Rechargez la page. Si le problème persiste, revenez à l'accueil ou contactez TVM38.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 active:scale-[0.98]">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Recharger
            </button>
            <a href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-on-surface transition hover:border-primary/40 hover:text-primary active:scale-[0.98]">
              <Home aria-hidden="true" className="h-4 w-4" />
              Retour à l'accueil
            </a>
          </div>
          <a className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-primary hover:underline" href="mailto:tvm38@midali.fr">
            tvm38@midali.fr
          </a>
        </section>
      </main>
    );
  }
}
