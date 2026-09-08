export default function LoadingScreen() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4" role="status" aria-live="polite">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border border-border/70 bg-card p-8 shadow-[0_14px_45px_rgba(0,83,161,0.08)]">
        <img src="/logo-tvm38.png" alt="" className="h-12 opacity-80" />
        <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-2/5 animate-loading-bar rounded-full bg-primary motion-reduce:w-full motion-reduce:animate-none" />
        </div>
        <p className="text-sm font-semibold text-secondary">Chargement de la page</p>
      </div>
    </div>
  );
}
