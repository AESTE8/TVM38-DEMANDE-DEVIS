import { useMemo, useState } from 'react';
import { X, ArrowLeft, Check, Info, TriangleAlert, Compass } from 'lucide-react';
import {
  PROJETS, DECHARGE, COEFFICIENTS, MENTION_INDICATIVE,
  calculerCouches, resumeParcours, materiau, infoMateriau,
  type Projet, type VarianteProjet, type OrigineDecharge, type ReponseDecharge, type Mesure, type CoucheCalculee,
} from '@/data/guide';
import { cn } from '@/lib/utils';

interface Props {
  mode: 'livraison' | 'decharge';
  onClose: () => void;
  /** Les tonnages s'ajoutent aux lignes existantes : jamais d'écrasement. */
  onAjouter: (ajouts: { materiauId: string; tonnes: number }[], resume: string) => void;
}

const arrondi = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export default function AssistantMateriaux({ mode, onClose, onAjouter }: Props) {
  const [projet, setProjet] = useState<Projet | null>(null);
  const [variante, setVariante] = useState<VarianteProjet | null>(null);
  const [origine, setOrigine] = useState<OrigineDecharge | null>(null);
  const [reponse, setReponse] = useState<ReponseDecharge | null>(null);

  const [longueur, setLongueur] = useState('');
  const [largeur, setLargeur] = useState('');
  const [surfaceDirecte, setSurfaceDirecte] = useState('');
  const [volume, setVolume] = useState('');
  const [saisieSurface, setSaisieSurface] = useState<'dimensions' | 'surface'>('dimensions');
  const [couchesExclues, setCouchesExclues] = useState<string[]>([]);
  const [detailOuvert, setDetailOuvert] = useState(false);

  const nombre = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) || n < 0 ? 0 : n;
  };

  const surfaceM2 = saisieSurface === 'dimensions'
    ? nombre(longueur) * nombre(largeur)
    : nombre(surfaceDirecte);

  const mesure: Mesure | null = useMemo(() => {
    if (!variante) return null;
    if (variante.modeMesure === 'volume') {
      const v = nombre(volume);
      return v > 0 ? { type: 'volume', volumeM3: v } : null;
    }
    return surfaceM2 > 0 ? { type: 'surface', surfaceM2 } : null;
  }, [variante, volume, surfaceM2]);

  const couches: CoucheCalculee[] = useMemo(
    () => (variante && mesure ? calculerCouches(variante, mesure) : []),
    [variante, mesure],
  );
  const couchesRetenues = couches.filter(c => !couchesExclues.includes(c.materiau.id + c.role));

  // --- décharge : la quantité se saisit en m³ de benne ------------------------
  const materiauDecharge = reponse ? materiau(reponse.materiauId) : undefined;
  const tonnesDecharge = materiauDecharge ? arrondi(nombre(volume) * materiauDecharge.masseVolumique) : 0;

  const revenir = () => {
    if (mode === 'livraison') {
      if (variante) { setVariante(null); setCouchesExclues([]); return; }
      if (projet) { setProjet(null); return; }
    } else {
      if (reponse) { setReponse(null); return; }
      if (origine) { setOrigine(null); return; }
    }
    onClose();
  };

  const valider = () => {
    if (mode === 'livraison') {
      if (!projet || !variante || !mesure || couchesRetenues.length === 0) return;
      const ajouts = couchesRetenues.map(c => ({ materiauId: c.materiau.id, tonnes: c.tonnes }));
      const dims = saisieSurface === 'dimensions'
        ? { longueur: nombre(longueur), largeur: nombre(largeur) }
        : undefined;
      onAjouter(ajouts, resumeParcours(projet, variante, mesure, couchesRetenues, dims));
    } else {
      if (!origine || !reponse || !materiauDecharge || tonnesDecharge <= 0) return;
      const resume = [
        '— Assistant matériaux (décharge) —',
        `Origine déclarée : ${origine.label}`,
        origine.question2 ? `${origine.question2} ${reponse.label}` : `Classement : ${reponse.label}`,
        `Volume estimé : ${nombre(volume)} m³ → ${materiauDecharge.nom} (${tonnesDecharge} t)`,
        '—',
      ].join('\n');
      onAjouter([{ materiauId: materiauDecharge.id, tonnes: tonnesDecharge }], resume);
    }
    onClose();
  };

  const titre = mode === 'livraison'
    ? (!projet ? 'Quel est votre projet ?' : !variante ? projet.question2 : 'Vos dimensions')
    : (!origine ? DECHARGE.question1 : !reponse ? (origine.question2 ?? 'Classement') : 'Votre volume');

  const etape = mode === 'livraison'
    ? (!projet ? 1 : !variante ? 2 : 3)
    : (!origine ? 1 : !reponse ? 2 : 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* En-tête */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <button type="button" onClick={revenir} className="p-1.5 -ml-1.5 rounded-lg hover:bg-surface-container-highest text-secondary" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary/70">
              Aide au choix · étape {etape} sur 3
            </p>
            <h3 className="font-headline font-bold text-base sm:text-lg uppercase tracking-tight truncate">{titre}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg hover:bg-surface-container-highest text-secondary" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto px-5 py-5 space-y-3">

          {/* --- Livraison : étape 1, le projet --- */}
          {mode === 'livraison' && !projet && PROJETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProjet(p)}
              className="w-full text-left px-4 py-3.5 rounded-lg border border-border bg-surface-container-highest hover:border-primary hover:bg-primary/5 transition-colors font-bold text-sm uppercase tracking-tight"
            >
              {p.label}
            </button>
          ))}

          {/* --- Livraison : étape 2, la variante --- */}
          {mode === 'livraison' && projet && !variante && projet.variantes.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariante(v)}
              className="w-full text-left px-4 py-3.5 rounded-lg border border-border bg-surface-container-highest hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <span className="block font-bold text-sm uppercase tracking-tight">{v.label}</span>
              {v.aide && <span className="block text-xs text-secondary mt-0.5 font-body normal-case">{v.aide}</span>}
            </button>
          ))}

          {/* --- Livraison : étape 3, dimensions et résultat --- */}
          {mode === 'livraison' && projet && variante && (
            <div className="space-y-5">
              {variante.modeMesure === 'volume' ? (
                <div>
                  <label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                    Volume à remplir (m³)
                  </label>
                  <input
                    type="number" inputMode="decimal" min="0" step="0.5" value={volume}
                    onChange={e => setVolume(e.target.value)}
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-surface text-lg font-bold"
                    placeholder="Ex : 4"
                  />
                  <p className="text-xs text-secondary mt-1.5">
                    Longueur × largeur × hauteur de l'ouvrage, en mètres.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex gap-1 p-1 bg-surface-container-highest rounded-lg w-full max-w-xs mb-3">
                    {(['dimensions', 'surface'] as const).map(m => (
                      <button
                        key={m} type="button" onClick={() => setSaisieSurface(m)}
                        className={cn(
                          'flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors',
                          saisieSurface === m ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary',
                        )}
                      >
                        {m === 'dimensions' ? 'Longueur × largeur' : 'Surface'}
                      </button>
                    ))}
                  </div>

                  {saisieSurface === 'dimensions' ? (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Longueur (m)</label>
                        <input type="number" inputMode="decimal" min="0" step="0.5" value={longueur} onChange={e => setLongueur(e.target.value)}
                          className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-surface text-lg font-bold" placeholder="12" />
                      </div>
                      <span className="pb-3 text-secondary font-bold">×</span>
                      <div className="flex-1">
                        <label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Largeur (m)</label>
                        <input type="number" inputMode="decimal" min="0" step="0.5" value={largeur} onChange={e => setLargeur(e.target.value)}
                          className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-surface text-lg font-bold" placeholder="3,5" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Surface (m²)</label>
                      <input type="number" inputMode="decimal" min="0" step="1" value={surfaceDirecte} onChange={e => setSurfaceDirecte(e.target.value)}
                        className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-surface text-lg font-bold" placeholder="42" />
                    </div>
                  )}

                  {surfaceM2 > 0 && (
                    <p className="text-xs text-secondary mt-2 font-bold">Surface : {arrondi(surfaceM2)} m²</p>
                  )}
                </div>
              )}

              {/* Résultat */}
              {couches.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary/80">
                    Structure conseillée
                  </p>

                  {couches.map(c => {
                    const cle = c.materiau.id + c.role;
                    const exclue = couchesExclues.includes(cle);
                    return (
                      <button
                        key={cle}
                        type="button"
                        onClick={() => setCouchesExclues(p => exclue ? p.filter(x => x !== cle) : [...p, cle])}
                        className={cn(
                          'w-full flex items-start gap-3 text-left p-3 rounded-lg border transition-colors',
                          exclue ? 'border-border bg-surface opacity-60' : 'border-primary/30 bg-surface',
                        )}
                      >
                        <span className={cn(
                          'w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5',
                          exclue ? 'border-border' : 'bg-primary border-primary',
                        )}>
                          {!exclue && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-secondary">
                            {c.role}{c.epaisseurCm > 0 ? ` · ${c.epaisseurCm} cm` : ''}
                          </span>
                          <span className="block font-bold text-sm uppercase tracking-tight">{c.materiau.nom}</span>
                        </span>
                        <span className="font-headline font-black text-lg tabular-nums shrink-0">{c.tonnes} t</span>
                      </button>
                    );
                  })}

                  <button type="button" onClick={() => setDetailOuvert(o => !o)} className="text-xs font-bold text-primary underline underline-offset-2">
                    {detailOuvert ? 'Masquer le détail du calcul' : 'Voir le détail du calcul'}
                  </button>

                  {detailOuvert && (
                    <div className="text-xs text-secondary space-y-1.5 font-body bg-surface rounded-lg p-3">
                      {couches.map(c => (
                        <p key={'d' + c.materiau.id + c.role}>
                          <span className="font-bold">{c.role}</span> : {c.volumeGeometriqueM3} m³
                          {' '}× {c.coefficient} ({COEFFICIENTS[c.compactage].libelle.toLowerCase()})
                          {' '}× {c.materiau.masseVolumique} t/m³ = <span className="font-bold">{c.tonnes} t</span>
                        </p>
                      ))}
                      <p className="pt-1 border-t border-border/60">
                        {COEFFICIENTS.compactee.explication}
                      </p>
                    </div>
                  )}

                  {variante.note && (
                    <p className="flex gap-2 text-xs text-secondary font-body">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                      <span>{variante.note}</span>
                    </p>
                  )}

                  {variante.nonFourni && (
                    <p className="flex gap-2 text-xs font-body text-tertiary">
                      <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span><span className="font-bold">Non fourni par TVM38 :</span> {variante.nonFourni}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- Décharge : étape 1, l'origine --- */}
          {mode === 'decharge' && !origine && DECHARGE.origines.map(o => (
            <button
              key={o.id} type="button" onClick={() => { setOrigine(o); if (!o.question2) setReponse(o.reponses[0]); }}
              className="w-full text-left px-4 py-3.5 rounded-lg border border-border bg-surface-container-highest hover:border-purple-500 hover:bg-purple-500/5 transition-colors font-bold text-sm uppercase tracking-tight"
            >
              {o.label}
            </button>
          ))}

          {/* --- Décharge : étape 2, la question de contrôle --- */}
          {mode === 'decharge' && origine && !reponse && origine.reponses.map(rep => (
            <button
              key={rep.id} type="button" onClick={() => setReponse(rep)}
              className="w-full text-left px-4 py-3.5 rounded-lg border border-border bg-surface-container-highest hover:border-purple-500 hover:bg-purple-500/5 transition-colors font-bold text-sm"
            >
              {rep.label}
            </button>
          ))}

          {/* --- Décharge : étape 3, le volume --- */}
          {mode === 'decharge' && origine && reponse && materiauDecharge && (
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.2em] text-purple-600/80">Classement retenu</p>
                <p className="font-bold text-sm uppercase tracking-tight mt-1">{materiauDecharge.nom}</p>
                {infoMateriau(materiauDecharge.id)?.eviter && (
                  <p className="text-xs text-secondary mt-2 font-body">{infoMateriau(materiauDecharge.id)?.eviter}</p>
                )}
                {origine.note && <p className="text-xs text-secondary mt-2 font-body">{origine.note}</p>}
              </div>

              <div>
                <label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Volume à évacuer (m³)</label>
                <input
                  type="number" inputMode="decimal" min="0" step="0.5" value={volume}
                  onChange={e => setVolume(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-surface text-lg font-bold"
                  placeholder="Ex : 6"
                />
                <p className="text-xs text-secondary mt-1.5">
                  Une benne de camion 4×2 fait environ 5 m³, un 8×4 environ 10 m³.
                </p>
              </div>

              {tonnesDecharge > 0 && (
                <p className="text-sm font-bold">
                  ≈ <span className="font-headline font-black text-lg">{tonnesDecharge} t</span>
                  <span className="text-secondary font-normal text-xs"> ({nombre(volume)} m³ × {materiauDecharge.masseVolumique} t/m³)</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pied */}
        {((mode === 'livraison' && couchesRetenues.length > 0) || (mode === 'decharge' && tonnesDecharge > 0)) && (
          <div className="border-t border-border px-5 py-4 space-y-3 shrink-0 bg-surface">
            <p className="flex gap-2 text-[0.7rem] text-secondary font-body leading-snug">
              <Compass className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{MENTION_INDICATIVE}</span>
            </p>
            <button
              type="button"
              onClick={valider}
              className="w-full bg-industrial-gradient text-white rounded-xl py-3 font-extrabold uppercase text-sm tracking-wide hover:brightness-110 active:scale-[0.99] transition-all shadow-md"
            >
              Ajouter au devis
              {mode === 'livraison'
                ? ` · ${arrondi(couchesRetenues.reduce((s, c) => s + c.tonnes, 0))} t`
                : ` · ${tonnesDecharge} t`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
