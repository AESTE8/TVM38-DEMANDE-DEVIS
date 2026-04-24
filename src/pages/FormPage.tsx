import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DevisFormData, LigneDevis } from '@/types';
import { toast, Toaster } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Zap, MapPin, ShieldCheck, Truck, Package, ArrowDownToLine } from 'lucide-react';

import Header from '@/components/layout/Header';
import ClientBadge from '@/components/ClientBadge';
import SectionClient, { SectionClientHandle } from '@/components/form/SectionClient';
import { getConnectedClient } from '@/lib/auth';
import SectionDemande from '@/components/form/SectionDemande';
import SectionMateriaux from '@/components/form/SectionMateriaux';
import { MATERIAUX } from '@/data/materiaux';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Validation schema
const schema = z.object({
  dejaClient: z.enum(['oui', 'non']),
  typeClient: z.enum(['professionnel', 'particulier']),
  entrepriseNom: z.string().optional(),
  entrepriseAdresse: z.string().optional(),
  agenceNom: z.string().optional(),
  fonction: z.string().optional(),
  nom: z.string().min(2, 'Nom requis'),
  prenom: z.string().min(2, 'Prénom requis'),
  telephone: z.string()
    .regex(/^(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}$/, 'Numéro français invalide (ex : 06 12 34 56 78)'),
  email: z.string().email('Adresse email invalide'),
  typeDemande: z.enum(['livraison', 'fourniture', 'decharge']),
  adresseLivraison: z.string().optional(),
  dateSouhaitee: z.string().optional(),
  creneau: z.enum(['matin', 'apres_midi', 'indifferent']).optional(),
  lignes: z.array(z.object({
    materiauId: z.string(),
    quantiteTonnes: z.number(),
    quantiteM3: z.number(),
    modeEntree: z.enum(['tonnes', 'm3']),
  })),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.typeClient === 'professionnel') {
    if (!data.entrepriseNom || data.entrepriseNom.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nom d'entreprise requis", path: ['entrepriseNom'] });
    }
    if (!data.entrepriseAdresse || data.entrepriseAdresse.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adresse d'entreprise requise", path: ['entrepriseAdresse'] });
    }
  }
  if (data.typeDemande === 'livraison' && (!data.adresseLivraison || data.adresseLivraison.trim().length < 5)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adresse de livraison requise", path: ['adresseLivraison'] });
  }
  if (!data.lignes.some(l => l.quantiteTonnes > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Veuillez sélectionner au moins un matériau', path: ['lignes'] });
  }
});

const STEPS = [
  { n: 1, label: 'Coordonnées' },
  { n: 2, label: 'Projet' },
  { n: 3, label: 'Matériaux' },
  { n: 4, label: 'Récapitulatif' },
];

const CRENEAU_LABELS: Record<string, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  indifferent: 'Indifférent',
};

export default function FormPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm<DevisFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      dejaClient: 'oui',
      typeClient: 'professionnel',
      typeDemande: 'livraison',
      creneau: 'indifferent',
      lignes: [],
    },
  });
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const sectionClientRef = useRef<SectionClientHandle>(null);
  const connectedClient = getConnectedClient();

  useEffect(() => {
    document.title = "Valorisation de matériaux - Devis";
  }, []);

  // Pré-remplissage depuis la session client connecté
  useEffect(() => {
    if (!connectedClient) return;
    setValue('dejaClient', 'oui');
    setValue('typeClient', connectedClient.type === 'particulier' ? 'particulier' : 'professionnel');
    if (connectedClient.nom) setValue('entrepriseNom', connectedClient.nom);
    if (connectedClient.adresse) setValue('entrepriseAdresse', connectedClient.adresse);
    const principal = connectedClient.contacts?.find((c: any) => c.principal) ?? connectedClient.contacts?.[0];
    if (principal) {
      if (principal.nom) setValue('nom', principal.nom);
      if (principal.prenom) setValue('prenom', principal.prenom);
      if (principal.telephone) setValue('telephone', principal.telephone);
      if (principal.email) setValue('email', principal.email);
      if (principal.fonction) setValue('fonction', principal.fonction);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValue('lignes', lignes);
  }, [lignes, setValue]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const validateStep = async (step: number): Promise<boolean> => {
    if (step === 1) {
      const fields: (keyof DevisFormData)[] = ['nom', 'prenom', 'telephone', 'email'];
      if (watch('typeClient') === 'professionnel') {
        fields.push('entrepriseNom', 'entrepriseAdresse');
      }
      return await trigger(fields);
    }
    if (step === 2) {
      if (watch('typeDemande') === 'livraison') {
        return await trigger(['adresseLivraison']);
      }
      return true;
    }
    if (step === 3) {
      const hasMateriaux = lignes.some(l => l.quantiteTonnes > 0);
      if (!hasMateriaux) {
        await trigger(['lignes']);
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = async () => {
    const valid = await validateStep(currentStep);
    if (valid) {
      setCurrentStep(s => s + 1);
      scrollTop();
    }
  };

  const handleBack = () => {
    setCurrentStep(s => s - 1);
    scrollTop();
  };

  const goToStep = (n: number) => {
    if (n < currentStep) {
      setCurrentStep(n);
      scrollTop();
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const onSubmit = async (data: DevisFormData) => {
    setSubmitError(null);

    try {
      await sectionClientRef.current?.saveNewContactIfNeeded(data);
      await sectionClientRef.current?.updateExistingContactIfChanged(data);
      await sectionClientRef.current?.saveNewAgenceIfNeeded(data);
      await sectionClientRef.current?.updateExistingAgenceIfChanged();
      await sectionClientRef.current?.updateClientInfoIfChanged(data);
    } catch (err) {
      console.warn('Supabase sync partielle :', err);
      // L'email Web3Forms reste le filet de sécurité — on continue quand même
    }

    try {
      const materiaux = (data.lignes || [])
        .map((l: any) => {
          const mat = MATERIAUX.find(m => m.id === l.materiauId);
          return `- ${mat?.nom ?? l.materiauId} : ${l.quantiteTonnes}t (${l.quantiteM3}m³)`;
        })
        .join('\n');

      const payload = {
        // Contact
        prenom: data.prenom,
        nom: data.nom,
        fonction: data.fonction,
        email: data.email,
        telephone: data.telephone,
        // Client
        typeClient: data.typeClient,
        dejaClient: data.dejaClient,
        entrepriseNom: data.entrepriseNom,
        entrepriseAdresse: data.entrepriseAdresse,
        agenceNom: data.agenceNom,
        // Demande
        typeDemande: data.typeDemande,
        adresseLivraison: data.adresseLivraison,
        dateSouhaitee: data.dateSouhaitee,
        creneau: data.creneau,
        // Matériaux & notes
        materiaux,
        notes: data.notes,
      };

      const res = await fetch(
        "https://dnauasukwbvwmhzjeecj.supabase.co/functions/v1/send-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (result.success) {
        navigate('/merci', { state: { typeClient: data.typeClient } });
      } else {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      toast.error(`Erreur d'envoi : ${message}`);
      setSubmitError(message);
    }
  };

  // Recap data
  const formValues = watch();
  const selectedMateriaux = lignes
    .filter(l => l.quantiteTonnes > 0)
    .map(l => {
      const mat = MATERIAUX.find(m => m.id === l.materiauId);
      return { nom: mat?.nom ?? l.materiauId, quantite: l.quantiteTonnes };
    });

  return (
    <div className="min-h-screen bg-surface">
      <Header>
        {connectedClient && <ClientBadge />}
      </Header>

      {/* Barre de progression */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center">
            {STEPS.map(({ n, label }, i) => (
              <div key={n} className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  disabled={n >= currentStep}
                  onClick={() => goToStep(n)}
                  className={cn(
                    "flex items-center gap-2 shrink-0",
                    n < currentStep ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0",
                    currentStep === n ? "bg-primary text-white shadow-sm ring-4 ring-primary/20" :
                    currentStep > n ? "bg-primary/20 text-primary" :
                    "bg-surface-container text-secondary"
                  )}>
                    {currentStep > n ? '✓' : n}
                  </div>
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-tight hidden sm:block transition-colors",
                    currentStep === n ? "text-primary" :
                    currentStep > n ? "text-primary/50 hover:text-primary" :
                    "text-secondary/40"
                  )}>
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors",
                    currentStep > n ? "bg-primary/40" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
          {/* Barre de progression */}
          <div className="mt-3 h-1 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="pt-8 pb-16">
        <section className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className={cn(
            "grid gap-12",
            currentStep === 1 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
          )}>

            {/* Colonne gauche — étape 1 uniquement */}
            {currentStep === 1 && (
              <div className="lg:col-span-1 space-y-8">
                <div className="relative overflow-hidden rounded-xl aspect-[4/5] shadow-2xl">
                  <img
                    alt="Centre de valorisation TVM38"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 hover:scale-105"
                    src="/bg-login.jpg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent flex flex-col justify-end p-8">
                    <span className="font-headline font-black text-3xl text-white tracking-tighter uppercase mb-2">Expertise TVM38</span>
                    <p className="text-surface-variant text-sm italic opacity-90">Filiale de Midali, TVM38 est votre centre de valorisation & traitement de matériaux depuis 2000.</p>
                  </div>
                </div>
                <div className="bg-surface-container-low p-8 border-l-4 border-primary">
                  <h3 className="font-headline font-bold text-xl mb-5">Pourquoi nous choisir ?</h3>
                  <ul className="space-y-5">
                    <li className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-primary" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-primary font-bold uppercase tracking-tighter text-sm block mb-0.5">Rapidité</span>
                        <span className="text-sm text-secondary leading-snug">Traitement prioritaire de vos demandes pour ne pas ralentir vos chantiers.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-primary" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-primary font-bold uppercase tracking-tighter text-sm block mb-0.5">Locale</span>
                        <span className="text-sm text-secondary leading-snug">Société familiale implantée dans le Grésivaudan depuis 1937.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-primary font-bold uppercase tracking-tighter text-sm block mb-0.5">Conforme</span>
                        <span className="text-sm text-secondary leading-snug">Matériaux certifiés conformes aux normes CE.</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Contenu du formulaire */}
            <div className={currentStep === 1 ? "lg:col-span-2" : "max-w-2xl mx-auto w-full"}>
              <div className="bg-surface-container-lowest p-6 md:p-10 shadow-sm rounded-xl border-t-4 border-primary/80">
                <form onSubmit={handleSubmit(onSubmit)} noValidate>

                  {/* Étape 1 — Coordonnées (toujours monté pour conserver le ref) */}
                  <div className={currentStep !== 1 ? "hidden" : ""}>
                    <SectionClient
                      ref={sectionClientRef}
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      connectedClient={connectedClient ?? undefined}
                    />
                  </div>

                  {/* Étape 2 — Projet */}
                  {currentStep === 2 && (
                    <SectionDemande
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                    />
                  )}

                  {/* Étape 3 — Matériaux */}
                  {currentStep === 3 && (
                    <>
                      <SectionMateriaux lignes={lignes} setLignes={setLignes} typeDemande={watch('typeDemande')} onNext={handleNext} />
                      {errors.lignes && (
                        <p className="text-sm text-destructive font-medium bg-error-container p-3 rounded-lg border border-destructive/20 mt-4">
                          {errors.lignes.message as string}
                        </p>
                      )}
                    </>
                  )}

                  {/* Étape 4 — Récapitulatif */}
                  {currentStep === 4 && (
                    <div>
                      <div className="flex items-center gap-4 mb-8">
                        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">04</span>
                        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">Récapitulatif</h2>
                      </div>

                      <div className="space-y-3 mb-8">
                        {/* Contact */}
                        <div className="p-5 border border-border rounded-xl bg-surface-container-highest">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary">Contact</span>
                            <button
                              type="button"
                              onClick={() => goToStep(1)}
                              className="text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                          </div>
                          <div className="text-sm space-y-0.5 text-on-surface">
                            {formValues.typeClient === 'professionnel' && formValues.entrepriseNom && (
                              <p className="font-bold">{formValues.entrepriseNom}</p>
                            )}
                            <p>{formValues.prenom} {formValues.nom}</p>
                            <p className="text-secondary text-xs">{formValues.telephone} · {formValues.email}</p>
                          </div>
                        </div>

                        {/* Projet */}
                        <div className="p-5 border border-border rounded-xl bg-surface-container-highest">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary">Projet</span>
                            <button
                              type="button"
                              onClick={() => goToStep(2)}
                              className="text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                          </div>
                          <div className="text-sm space-y-0.5 text-on-surface">
                            <p className="font-bold flex items-center gap-2">
                              {formValues.typeDemande === 'livraison' && <><Truck className="w-4 h-4 text-primary shrink-0" /> Livraison avec transport</>}
                              {formValues.typeDemande === 'fourniture' && <><Package className="w-4 h-4 text-primary shrink-0" /> Fourniture uniquement</>}
                              {formValues.typeDemande === 'decharge' && <><ArrowDownToLine className="w-4 h-4 text-primary shrink-0" /> Mise en décharge</>}
                            </p>
                            {formValues.typeDemande === 'livraison' && formValues.adresseLivraison && (
                              <p className="text-secondary text-xs">{formValues.adresseLivraison}</p>
                            )}
                            {formValues.typeDemande === 'decharge' && (
                              <p className="text-secondary text-xs">489 Rue de l'Isle, 38190 Villard-Bonnot</p>
                            )}
                            {formValues.dateSouhaitee && (
                              <p className="text-secondary text-xs">
                                Le {formatDate(formValues.dateSouhaitee)} — {CRENEAU_LABELS[formValues.creneau ?? 'indifferent']}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Matériaux */}
                        <div className="p-5 border border-border rounded-xl bg-surface-container-highest">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary">Matériaux</span>
                            <button
                              type="button"
                              onClick={() => goToStep(3)}
                              className="text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                          </div>
                          <ul className="space-y-1.5">
                            {selectedMateriaux.map((m, i) => (
                              <li key={i} className="flex justify-between items-center text-sm">
                                <span className="text-on-surface">{m.nom}</span>
                                <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full text-xs">{m.quantite} t</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2 mb-8">
                        <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary" htmlFor="notes">
                          Une précision à ajouter ?
                          <span className="text-[10px] normal-case font-normal ml-2 opacity-60">(accès chantier, contraintes horaires... — optionnel)</span>
                        </Label>
                        <Textarea
                          id="notes"
                          {...register('notes')}
                          placeholder="Ex : portail code 1234, accès difficile par la droite..."
                          rows={4}
                          className="w-full bg-surface-container-highest border-none rounded-sm px-4 py-3 focus:ring-0 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all placeholder-on-surface-variant/40 resize-none text-sm font-body"
                        />
                      </div>

                      {submitError && (
                        <div className="bg-error-container border border-destructive/30 rounded-lg px-5 py-4 space-y-2 mb-6">
                          <p className="text-sm font-bold text-destructive">L'envoi a échoué : {submitError}</p>
                          <p className="text-xs text-destructive/80">
                            Vous pouvez nous contacter directement :{' '}
                            <a href="mailto:tvm38@midali.fr" className="underline font-bold hover:opacity-80">tvm38@midali.fr</a>
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold px-12 py-5 rounded-md hover:shadow-xl active:scale-[0.98] transition-all uppercase tracking-tighter text-base md:text-xl"
                      >
                        {isSubmitting ? 'Envoi...' : 'Envoyer ma demande →'}
                      </button>
                      <p className="text-xs text-secondary text-center mt-3 max-w-xs mx-auto">
                        En envoyant ce formulaire, vous acceptez que vos données soient traitées par MIDALI - TVM38 pour l'établissement de votre devis.
                      </p>
                    </div>
                  )}

                  {/* Boutons de navigation */}
                  {currentStep < 4 && (
                    <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
                      {currentStep > 1 ? (
                        <button
                          type="button"
                          onClick={handleBack}
                          className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors font-medium"
                        >
                          <ChevronLeft className="w-4 h-4" /> Retour
                        </button>
                      ) : <div />}
                      <button
                        type="button"
                        onClick={handleNext}
                        className="ml-auto bg-primary text-on-primary font-headline font-bold px-8 py-3 rounded-md hover:shadow-md active:scale-[0.98] transition-all uppercase tracking-tight text-sm"
                      >
                        Continuer →
                      </button>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors font-medium"
                      >
                        <ChevronLeft className="w-4 h-4" /> Retour aux matériaux
                      </button>
                    </div>
                  )}

                </form>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Footer */}
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
              <a className="font-body text-sm text-primary font-bold hover:underline" href="tel:0476714211">04 76 71 42 11</a><br/>
              <a className="font-body text-sm text-secondary hover:text-primary transition-colors" href="mailto:tvm38@midali.fr">tvm38@midali.fr</a>
            </div>
          </div>
        </div>
        <div className="px-12 py-6 border-t border-border/40 text-center bg-surface-container-low">
          <p className="font-body text-sm text-secondary italic opacity-80 decoration-none">© 2026 MIDALI - TVM38 Materials & Delivery. Tous droits réservés.</p>
        </div>
      </footer>
      <Toaster richColors position="top-center" />
    </div>
  );
}
