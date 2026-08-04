import { useState, useMemo } from 'react';
import { Search, Package, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MATERIAUX, SECTION_ORDER } from '@/data/materiaux';
import { LigneDevis, TypeDemande } from '@/types';
import MaterialCard from './MaterialCard';
import { cn } from '@/lib/utils';

const SECTION_DECHARGE = 'Déblais en décharge';

interface Props {
  lignes: LigneDevis[];
  setLignes: React.Dispatch<React.SetStateAction<LigneDevis[]>>;
  typeDemande?: TypeDemande;
  onNext?: () => void;
  activeTab?: 'livraison' | 'decharge';
  onActiveTabChange?: (tab: 'livraison' | 'decharge') => void;
}

export default function SectionMateriaux({ lignes, setLignes, typeDemande, onNext, activeTab: activeTabProp, onActiveTabChange }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localTab, setLocalTab] = useState<'livraison' | 'decharge'>('livraison');
  const activeTab = activeTabProp ?? localTab;
  const setActiveTab = (tab: 'livraison' | 'decharge') => { setLocalTab(tab); onActiveTabChange?.(tab); };

  const isDecharge = typeDemande === 'decharge';
  const isCombi = typeDemande === 'livraison_decharge';

  const filteredMateriaux = useMemo(() => {
    let base: typeof MATERIAUX;
    if (isDecharge) {
      base = MATERIAUX.filter(m => m.section === SECTION_DECHARGE);
    } else if (isCombi) {
      base = activeTab === 'livraison'
        ? MATERIAUX.filter(m => m.section !== SECTION_DECHARGE)
        : MATERIAUX.filter(m => m.section === SECTION_DECHARGE);
    } else {
      base = MATERIAUX;
    }
    return base.filter(m =>
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, isDecharge, isCombi, activeTab]);

  const groupedMateriaux = useMemo(() => {
    const groups: Record<string, typeof MATERIAUX> = {};
    filteredMateriaux.forEach(mat => {
      if (!groups[mat.section]) groups[mat.section] = [];
      groups[mat.section].push(mat);
    });
    return groups;
  }, [filteredMateriaux]);

  const updateLigne = (materiauId: string, updates: Partial<LigneDevis>) => {
    setLignes(prev => {
      const idx = prev.findIndex(l => l.materiauId === materiauId && (!isCombi || l.type === activeTab));
      const lineType = isCombi ? activeTab : undefined;
      if (idx >= 0) {
        const newLignes = [...prev];
        newLignes[idx] = { ...newLignes[idx], ...updates, type: lineType };
        return newLignes;
      }
      return [...prev, { materiauId, quantiteTonnes: 0, quantiteM3: 0, modeEntree: 'tonnes', ...updates, type: lineType }];
    });
  };

  const getLigne = (materiauId: string) => {
    if (isCombi) return lignes.find(l => l.materiauId === materiauId && l.type === activeTab);
    return lignes.find(l => l.materiauId === materiauId);
  };

  const selectedLignes = lignes.filter(l => l.quantiteTonnes > 0);
  const selectedLivraisonLignes = selectedLignes.filter(l => !isCombi || l.type === 'livraison');
  const selectedDechargeLignes = selectedLignes.filter(l => l.type === 'decharge');
  const totalTonnes = selectedLignes.reduce((sum, l) => sum + l.quantiteTonnes, 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">03</span>
        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">
          {isDecharge ? 'Choix des matériaux que vous souhaitez déposer' : isCombi ? 'Livraison & Décharge' : typeDemande === 'fourniture' ? 'Choix des matériaux que vous souhaitez récupérer' : 'Choix des matériaux à livrer'}
        </h2>
      </div>

      <div className="space-y-6">
        {/* Onglets — mode livraison + décharge */}
        {isCombi && (
          <div className="flex items-center gap-2 border-b border-border pb-0">
            <button
              type="button"
              onClick={() => { setActiveTab('livraison'); setSearch(''); setExpandedId(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px",
                activeTab === 'livraison'
                  ? "border-primary text-primary"
                  : "border-transparent text-secondary hover:text-on-surface"
              )}
            >
              <Package className="w-4 h-4" />
              Livraison
              {selectedLivraisonLignes.length > 0 && (
                <span className="ml-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {selectedLivraisonLignes.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('decharge'); setSearch(''); setExpandedId(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px",
                activeTab === 'decharge'
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-secondary hover:text-on-surface"
              )}
            >
              <Trash2 className="w-4 h-4" />
              Décharge
              {selectedDechargeLignes.length > 0 && (
                <span className="ml-1 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {selectedDechargeLignes.length}
                </span>
              )}
            </button>
          </div>
        )}

        {isCombi && (
          <p className="text-xs text-secondary font-body">
            {activeTab === 'livraison'
              ? 'Sélectionnez les matériaux que vous souhaitez recevoir sur chantier.'
              : 'Sélectionnez les déblais que notre camion récupérera sur place.'}
          </p>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-secondary/50" />
          <Input
            placeholder={
              isDecharge || (isCombi && activeTab === 'decharge')
                ? 'Ex : béton, enrobé, déblais...'
                : 'Ex : gravier, sable, tout-venant...'
            }
            className="pl-10 h-11"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-8">
          {SECTION_ORDER.map(section => {
            const mats = groupedMateriaux[section];
            if (!mats || mats.length === 0) return null;

            return (
              <div key={section} className="space-y-3">
                <h3 className={cn(
                  "font-label text-[0.7rem] font-bold uppercase tracking-[0.2em] border-b pb-1 ml-1",
                  isCombi && activeTab === 'decharge'
                    ? "text-purple-500/70 border-purple-100"
                    : "text-primary/70 border-primary/10"
                )}>
                  {section}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {mats.map(mat => (
                    <MaterialCard
                      key={`${mat.id}-${isCombi ? activeTab : 'single'}`}
                      materiau={mat}
                      ligne={getLigne(mat.id)}
                      isExpanded={expandedId === mat.id}
                      onToggle={() => setExpandedId(expandedId === mat.id ? null : mat.id)}
                      onUpdate={(updates) => updateLigne(mat.id, updates)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredMateriaux.length === 0 && (
            <p className="text-center text-secondary py-8 text-sm">Aucun matériau trouvé pour cette recherche.</p>
          )}
        </div>
      </div>

      {/* Bandeau flottant récapitulatif (Mobile & Desktop) */}
      {selectedLignes.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-40 bg-primary/95 backdrop-blur-md text-on-primary rounded-2xl md:rounded-full px-4 py-3 md:px-5 md:py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs md:text-sm font-bold animate-slide-up border border-white/20">
          {isCombi ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2">
                {selectedLivraisonLignes.length > 0 && (
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full"><Package className="w-3.5 h-3.5" /> {selectedLivraisonLignes.length}</span>
                )}
                {selectedLivraisonLignes.length > 0 && selectedDechargeLignes.length > 0 && <span className="opacity-60">·</span>}
                {selectedDechargeLignes.length > 0 && (
                  <span className="flex items-center gap-1 bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full"><Trash2 className="w-3.5 h-3.5 text-purple-300" /> {selectedDechargeLignes.length}</span>
                )}
              </span>
              <span className="opacity-60">·</span>
              <span className="text-amber-300">{Math.round(totalTonnes * 10) / 10} t</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>
                {selectedLignes.length} matériau{selectedLignes.length > 1 ? 'x' : ''} sélectionné{selectedLignes.length > 1 ? 's' : ''}
              </span>
              <span className="opacity-60">·</span>
              <span className="text-amber-300">{Math.round(totalTonnes * 10) / 10} t au total</span>
            </div>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="bg-industrial-gradient text-white rounded-xl md:rounded-full px-3.5 py-1.5 md:px-4 md:py-1.5 flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 text-xs uppercase font-extrabold"
              title="Étape suivante"
            >
              <span>Continuer</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
