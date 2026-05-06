import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-surface-container border-t border-border/20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-12 py-16 w-full max-w-screen-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-lg font-bold text-on-surface uppercase font-headline">MIDALI - TVM38</div>
          <p className="font-body text-sm text-secondary">Expert en vente de matériaux de construction en région Auvergne-Rhône-Alpes.</p>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-headline font-bold text-sm uppercase text-on-surface">Activités</span>
          <span className="font-body text-sm text-secondary">Vente de granulats & recyclés</span>
          <span className="font-body text-sm text-secondary">Livraison sur chantier</span>
          <span className="font-body text-sm text-secondary">Évacuation de gravats</span>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-headline font-bold text-sm uppercase text-on-surface">Liens utiles</span>
          <a className="font-body text-sm text-secondary hover:text-primary transition-colors" href="https://www.midali.fr" target="_blank" rel="noopener">Société MIDALI</a>
          <Link className="font-body text-sm text-secondary hover:text-primary transition-colors" to="/estimation">Laisser un avis</Link>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-headline font-bold text-sm uppercase text-on-surface">Contact</span>
          <div className="space-y-1">
            <p className="font-body text-sm text-on-surface font-bold">Maxime ROMANET</p>
            <p className="font-body text-xs text-secondary italic">Responsable de Carrière</p>
          </div>
          <p className="font-body text-sm text-secondary">489 Rue de l'Isle<br/>38190 Villard-Bonnot</p>
          <div className="space-y-1">
            <a className="font-body text-sm text-primary font-bold hover:underline" href="tel:0620721960">06 20 72 19 60</a><br/>
            <a className="font-body text-sm text-secondary hover:text-primary transition-colors" href="mailto:tvm38@midali.fr">tvm38@midali.fr</a>
          </div>
        </div>
      </div>
      <div className="px-12 py-6 border-t border-border/40 text-center bg-surface-container-low">
        <p className="font-body text-sm text-secondary italic opacity-80">© 2026 MIDALI - TVM38. Carrière et centre de valorisation en Isère. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
