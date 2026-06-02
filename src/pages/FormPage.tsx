import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DevisFormData, LigneDevis } from '@/types';
import { toast, Toaster } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Pencil, MapPin, ShieldCheck, Truck, Package, ArrowDownToLine, Trash2 } from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CAMIONS_CAPACITES, CAMIONS_LIVRAISON } from '@/data/camions';
import ClientBadge from '@/components/ClientBadge';
import SectionClient, { SectionClientHandle } from '@/components/form/SectionClient';
import { getConnectedClient, isGuestMode, clearGuestMode } from '@/lib/auth';
import { saveDraft, loadDraft, clearDraft, hasDraft } from '@/lib/formDraft';
import { supabase } from '@/lib/supabase';
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
  email: z.string().optional(),
  sansEmail: z.boolean().optional(),
  typeDemande: z.enum(['livraison', 'fourniture', 'decharge', 'livraison_decharge']),
  enginChantier: z.string().optional(),
  camionLivraison: z.string().optional(),
  adresseLivraison: z.string().optional(),
  dateSouhaitee: z.string().optional(),
  creneau: z.enum(['matin', 'apres_midi', 'indifferent']).optional(),
  lignes: z.array(z.object({
    materiauId: z.string(),
    quantiteTonnes: z.number(),
    quantiteM3: z.number(),
    modeEntree: z.enum(['tonnes', 'm3']),
    type: z.enum(['livraison', 'decharge']).optional(),
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
  if ((data.typeDemande === 'livraison' || data.typeDemande === 'livraison_decharge') && (!data.adresseLivraison || data.adresseLivraison.trim().length < 5)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adresse de livraison requise", path: ['adresseLivraison'] });
  }
  if (data.typeDemande === 'livraison' || data.typeDemande === 'livraison_decharge') {
    if (!data.camionLivraison) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Veuillez choisir un camion', path: ['camionLivraison'] });
    }
  }
  if (!data.lignes.some(l => l.quantiteTonnes > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Veuillez sélectionner au moins un matériau', path: ['lignes'] });
  }
  // Email requis et valide SEULEMENT si l'option "sans email" n'est pas activée
  if (!data.sansEmail) {
    if (!data.email || data.email.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Adresse email requise', path: ['email'] });
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Adresse email invalide', path: ['email'] });
    }
  }
  if (data.typeDemande === 'livraison_decharge') {
    if (!data.enginChantier || data.enginChantier.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Type d'engin requis", path: ['enginChantier'] });
    }
    if (!data.lignes.some(l => l.quantiteTonnes > 0 && l.type === 'livraison')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ajoutez au moins un matériau à livrer (onglet Livraison)', path: ['lignes'] });
    }
    if (!data.lignes.some(l => l.quantiteTonnes > 0 && l.type === 'decharge')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ajoutez au moins un déblai à récupérer (onglet Décharge)', path: ['lignes'] });
    }
  }
});

const STEP3_LABELS: Record<string, string> = {
  livraison: 'Livraison',
  fourniture: 'Matériaux',
  decharge: 'Déblais',
  livraison_decharge: 'Matériaux & Déblais',
};

const CRENEAU_LABELS: Record<string, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  indifferent: 'Indifférent',
};

export default function FormPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, reset, trigger, formState: { errors, isSubmitting } } = useForm<DevisFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      dejaClient: isGuestMode() ? 'non' : 'oui',
      typeClient: 'professionnel',
      typeDemande: 'livraison',
      creneau: 'indifferent',
      lignes: [],
      sansEmail: false,
    },
  });
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [typeDemandeChosen, setTypeDemandeChosen] = useState(false);
  const [combiTab, setCombiTab] = useState<'livraison' | 'decharge'>('livraison');
  const sectionClientRef = useRef<SectionClientHandle>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedClient = getConnectedClient();
  const guestMode = isGuestMode();
  const [stepAnimKey, setStepAnimKey] = useState(0);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [recapOpen, setRecapOpen] = useState(false);

  useEffect(() => {
    document.title = "Valorisation de matériaux - Devis";
  }, []);

  // Pré-remplissage depuis la session client connecté
  useEffect(() => {
    if (!connectedClient) return;
    setValue('dejaClient', 'oui');
    setValue('typeClient', connectedClient.type === 'particulier' ? 'particulier' : 'professionnel');

    if (connectedClient.type === 'particulier') {
      // Particulier : nom/prénom directement comme contact, pas comme entreprise
      if (connectedClient.nom) setValue('nom', connectedClient.nom);
      if (connectedClient.prenom) setValue('prenom', connectedClient.prenom);
      if (connectedClient.telephone) setValue('telephone', connectedClient.telephone);
      if (connectedClient.email) setValue('email', connectedClient.email);
    } else {
      // Professionnel (classique ou sans compte) : pré-remplissage entreprise
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
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValue('lignes', lignes);
  }, [lignes, setValue]);

  // Sauvegarde automatique du brouillon à chaque modification (debouncé 1s)
  useEffect(() => {
    const subscription = watch((data) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        saveDraft(data as Partial<DevisFormData>, lignes);
      }, 1000);
    });
    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [watch, lignes]);

  // Proposition de reprise si un brouillon existe au chargement
  useEffect(() => {
    if (!hasDraft()) return;
    toast('Formulaire en cours — reprendre où vous en étiez ?', {
      duration: 10000,
      action: {
        label: 'Reprendre',
        onClick: () => {
          const draft = loadDraft();
          if (!draft) return;
          const { lignes: draftLignes, ...formValues } = draft;
          reset(formValues as DevisFormData);
          if (draftLignes?.length) setLignes(draftLignes);
        },
      },
      cancel: {
        label: 'Nouveau',
        onClick: clearDraft,
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const validateStep = async (step: number): Promise<boolean> => {
    if (step === 1) {
      const fields: (keyof DevisFormData)[] = ['nom', 'prenom', 'telephone', 'email'];
      if (watch('typeClient') === 'professionnel' && !connectedClient) {
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
    if (currentStep === 2) setCombiTab('livraison');

    if (currentStep === 3 && watch('typeDemande') === 'livraison_decharge' && combiTab === 'livraison') {
      const hasLivraisonItems = lignes.some(l => l.type === 'livraison' && l.quantiteTonnes > 0);
      if (!hasLivraisonItems) {
        const ok = window.confirm("Vous n'avez sélectionné aucun matériau à livrer. Continuer quand même vers la décharge ?");
        if (!ok) return;
      }
      setCombiTab('decharge');
      scrollTop();
      return;
    }

    if (currentStep === 1 && connectedClient && (connectedClient.agences?.length ?? 0) > 0 && !watch('agenceNom')) {
      toast.error('Veuillez sélectionner une agence / un site de livraison avant de continuer.');
      return;
    }

    const valid = await validateStep(currentStep);
    if (!valid) {
      toast.error('Veuillez remplir tous les champs obligatoires avant de continuer.');
      return;
    }
    if (valid) {
      const nextStep = currentStep + 1;
      setStepDirection('forward');
      setStepAnimKey(k => k + 1);
      setRecapOpen(false);
      setCurrentStep(nextStep);
      scrollTop();
      if (nextStep === 4) {
        toast.success('Presque terminé — vérifiez votre demande');
      } else if (nextStep === 3) {
        toast.success(`Étape 3 sur 4 — ${STEP3_LABELS[watch('typeDemande')] ?? 'Produits'}`);
      } else if (nextStep === 2) {
        toast.success('Étape 2 sur 4 — Votre demande');
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && watch('typeDemande') === 'livraison_decharge' && combiTab === 'decharge') {
      setCombiTab('livraison');
      scrollTop();
      return;
    }
    setStepDirection('backward');
    setStepAnimKey(k => k + 1);
    setRecapOpen(false);
    setCurrentStep(s => s - 1);
    scrollTop();
  };

  const goToStep = (n: number) => {
    if (n < currentStep) {
      setStepDirection('backward');
      setStepAnimKey(k => k + 1);
      setRecapOpen(false);
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

    // Synchroniser les lignes dans le formulaire avant soumission
    setValue('lignes', lignes);

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
      const codeArticleMap: Record<string, string> = {};
      try {
        const { data: sbMateriaux } = await supabase
          .from('materiaux')
          .select('id, code_article');
        (sbMateriaux || []).forEach((m: any) => { if (m.code_article) codeArticleMap[m.id] = m.code_article; });
      } catch {
        // fallback silencieux — on continue sans code_article
      }

      const buildItem = (l: any) => {
        const mat = MATERIAUX.find(m => m.id === l.materiauId);
        return {
          code: codeArticleMap[l.materiauId] || mat?.code || '',
          nom: mat?.nom ?? l.materiauId,
          tonnes: l.quantiteTonnes,
        };
      };

      type MateriauxSection = { label: string; type?: string; items: { code: string; nom: string; tonnes: number }[] };
      let materiauxData: { sections: MateriauxSection[]; enginChantier?: string };

      if (data.typeDemande === 'livraison_decharge') {
        materiauxData = {
          sections: [
            { label: 'Matériaux à livrer', type: 'livraison', items: lignes.filter((l: any) => l.type === 'livraison' && l.quantiteTonnes > 0).map(buildItem) },
            { label: 'Déblais à récupérer', type: 'decharge', items: lignes.filter((l: any) => l.type === 'decharge' && l.quantiteTonnes > 0).map(buildItem) },
          ],
          enginChantier: data.enginChantier,
        };
      } else {
        materiauxData = {
          sections: [{ label: 'Matériaux', items: lignes.filter((l: any) => l.quantiteTonnes > 0).map(buildItem) }],
        };
      }

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
        camionLivraison: data.camionLivraison,
        dateSouhaitee: data.dateSouhaitee,
        creneau: data.creneau,
        // Matériaux & notes
        materiauxData: JSON.stringify(materiauxData),
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
        clearDraft();
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
  const steps = [
    { n: 1, label: 'Coordonnées' },
    { n: 2, label: 'Votre demande' },
    { n: 3, label: typeDemandeChosen ? (STEP3_LABELS[formValues.typeDemande] ?? 'Produits') : 'Produits' },
    { n: 4, label: 'Récapitulatif' },
  ];
  const selectedMateriaux = lignes
    .filter(l => l.quantiteTonnes > 0)
    .map(l => {
      const mat = MATERIAUX.find(m => m.id === l.materiauId);
      return { nom: mat?.nom ?? l.materiauId, quantite: l.quantiteTonnes, type: l.type };
    });

  return (
    <div className="min-h-screen bg-surface">
      <Header>
        {connectedClient && <ClientBadge />}
      </Header>

      {/* Barre de progression */}
      <div className="sticky top-[48px] md:top-[72px] z-30 bg-surface/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 pt-3 pb-2">
          <div className="flex items-center gap-3">
            {guestMode && (
              <button
                type="button"
                onClick={() => { clearGuestMode(); navigate('/'); }}
                className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary transition-colors shrink-0 pr-3 border-r border-border/50"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Connexion</span>
              </button>
            )}
            {steps.map(({ n, label }, i) => (
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
                    "text-xs font-bold uppercase tracking-tight hidden sm:block transition-colors leading-tight whitespace-nowrap",
                    currentStep === n ? "text-primary" :
                    currentStep > n ? "text-primary/50 hover:text-primary" :
                    "text-secondary/40"
                  )}>
                    {label}
                  </span>
                </button>
                {i < steps.length - 1 && (
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
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="pt-24 md:pt-28 pb-16">
        <section className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className={cn(
            "grid gap-12",
            currentStep === 1 ? "grid-cols-1 lg:grid-cols-3" :
            currentStep === 3 ? "grid-cols-1 lg:grid-cols-[260px_1fr]" :
            "grid-cols-1"
          )}>

            {/* Sidebar étape 3 — capacités camions (sticky) */}
            {currentStep === 3 && (
              <div className="hidden lg:block">
              <div className="sticky top-[160px] self-start">
                <div className="bg-surface-container-low border-l-4 border-primary p-6 rounded-sm">
                  <h3 className="font-headline font-bold text-sm uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    Infos pratiques
                  </h3>
                  <p className="text-xs text-secondary font-body mb-4 leading-snug">
                    Gabarits et capacités par type de camion :
                  </p>
                  <div className="w-full">
                    <div className="grid grid-cols-4 gap-x-2 mb-2 pb-1.5 border-b border-border/40">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60 font-body">Type</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60 font-body text-center">Charge</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60 font-body text-center">Hauteur</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60 font-body text-center">Largeur</span>
                    </div>
                    <ul className="divide-y divide-border/30">
                      {CAMIONS_CAPACITES.map(c => (
                        <li key={c.nom} className="grid grid-cols-4 gap-x-2 py-2 items-center">
                          <span className="text-xs font-bold text-on-surface font-body">{c.nom}</span>
                          <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full text-[10px] text-center">{c.capacite} t</span>
                          <span className="text-[10px] text-secondary font-body text-center leading-tight">{c.hauteur}</span>
                          <span className="text-[10px] text-secondary font-body text-center leading-tight">{c.largeur}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[10px] text-secondary/60 font-body mt-4 italic leading-snug">
                    Vous n'êtes pas sûr de la quantité ? Contactez-nous, nous vous guidons.
                  </p>
                </div>
              </div>
              </div>
            )}

            {/* Colonne gauche — étape 1 uniquement */}
            {currentStep === 1 && (
              <div className="lg:col-span-1 space-y-8 lg:pt-14">
                <div className="relative overflow-hidden rounded-xl aspect-[4/5] shadow-2xl">
                  <img
                    alt="Centre de valorisation TVM38"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 hover:scale-105"
                    src="/bg-login.jpg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent flex flex-col justify-end p-8">
                    <span className="font-headline font-black text-3xl text-white tracking-tighter uppercase mb-2">350+ clients BTP nous font confiance</span>
                    <p className="text-surface-variant text-sm italic opacity-90">Carrière & centre de valorisation à Villard-Bonnot — livraison sur chantier partout en Isère.</p>
                  </div>
                </div>
                <div className="bg-surface-container-low p-8 border-l-4 border-primary">
                  <h3 className="font-headline font-bold text-xl mb-5">Ce qui fait la différence</h3>
                  <ul className="space-y-5">
                    <li className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-primary" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-destructive font-bold uppercase tracking-tighter text-sm block mb-0.5">Basés en Isère dans le Grésivaudan</span>
                        <span className="text-sm text-secondary leading-snug">Société familiale depuis 1937 — on connaît vos chantiers et vos contraintes locales.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-primary font-bold uppercase tracking-tighter text-sm block mb-0.5">Certifiés CE</span>
                        <span className="text-sm text-secondary leading-snug">Matériaux conformes aux normes CE — acceptés sur tous vos marchés publics et privés.</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Contenu du formulaire */}
            <div className={
              currentStep === 1 ? "lg:col-span-2" :
              currentStep === 3 ? "w-full" :
              "max-w-2xl mx-auto w-full"
            }>
              <div className={cn("bg-surface-container-lowest shadow-sm rounded-xl border-t-4 border-primary/80", "px-6 pt-6 md:p-10", currentStep < 4 ? "pb-24" : "pb-6")}>
                <form onSubmit={handleSubmit(onSubmit)} noValidate>

                  {/* Message d'accueil personnalisé — particuliers et pros sans compte */}
                  {currentStep === 1 && connectedClient && (
                    <div className="mb-4 text-sm font-medium text-on-surface">
                      {connectedClient.type === 'particulier'
                        ? `Bonjour ${connectedClient.prenom || connectedClient.nom} !`
                        : `Bienvenue, ${connectedClient.nom} !`}
                    </div>
                  )}

                  {/* Bandeau rassurance — étape 1 uniquement */}
                  {currentStep === 1 && (
                    <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-surface-container rounded-sm border border-border/40 text-xs text-secondary font-body">
                      <span className="text-primary">⏱</span>
                      <span>Environ <strong>2 minutes</strong> — sans engagement, devis gratuit</span>
                    </div>
                  )}

                  {/* Étape 1 — Coordonnées (toujours monté pour conserver le ref) */}
                  <div className={currentStep !== 1 ? "hidden" : ""}>
                    <SectionClient
                      ref={sectionClientRef}
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      guestMode={guestMode}
                      connectedClient={connectedClient ?? undefined}
                    />
                  </div>

                  {currentStep > 1 && (
                    <div key={stepAnimKey} className={stepDirection === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}>

                      {/* Récap étape 1 — visible en étape 2 */}
                      {currentStep === 2 && (
                        <div className="mb-6 rounded-sm border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setRecapOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-container hover:bg-surface-container-high transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 shrink-0">Étape 1</span>
                              <span className="text-xs text-secondary font-medium truncate">
                                {formValues.typeClient === 'professionnel' && formValues.entrepriseNom ? `${formValues.entrepriseNom} — ` : ''}{formValues.prenom} {formValues.nom} · {formValues.telephone}
                              </span>
                            </div>
                            <ChevronLeft className={cn("w-3.5 h-3.5 text-secondary shrink-0 ml-2 transition-transform", recapOpen ? "-rotate-90" : "rotate-90")} />
                          </button>
                          {recapOpen && (
                            <div className="px-4 py-3 bg-surface-container/40 text-xs text-secondary space-y-1 animate-fade-in border-t border-border/30">
                              {formValues.email && <p>Email : <span className="text-on-surface">{formValues.email}</span></p>}
                              {formValues.fonction && <p>Fonction : <span className="text-on-surface">{formValues.fonction}</span></p>}
                              <button type="button" onClick={() => goToStep(1)} className="text-primary hover:underline font-medium flex items-center gap-1 mt-0.5">
                                <Pencil className="w-3 h-3" /> Modifier
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Récap étapes 1–2 — visible en étape 3 */}
                      {currentStep === 3 && (
                        <div className="mb-6 rounded-sm border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setRecapOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-container hover:bg-surface-container-high transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 shrink-0">Étapes 1–2</span>
                              <span className="text-xs text-secondary font-medium truncate">
                                {formValues.prenom} {formValues.nom} · {STEP3_LABELS[formValues.typeDemande] ?? formValues.typeDemande}
                                {(formValues.typeDemande === 'livraison' || formValues.typeDemande === 'livraison_decharge') && formValues.adresseLivraison ? ` · ${formValues.adresseLivraison}` : ''}
                              </span>
                            </div>
                            <ChevronLeft className={cn("w-3.5 h-3.5 text-secondary shrink-0 ml-2 transition-transform", recapOpen ? "-rotate-90" : "rotate-90")} />
                          </button>
                          {recapOpen && (
                            <div className="px-4 py-3 bg-surface-container/40 text-xs text-secondary space-y-1.5 animate-fade-in border-t border-border/30">
                              <div className="flex items-start justify-between gap-2">
                                <p>Contact : <span className="text-on-surface">{formValues.typeClient === 'professionnel' && formValues.entrepriseNom ? `${formValues.entrepriseNom}, ` : ''}{formValues.prenom} {formValues.nom}</span></p>
                                <button type="button" onClick={() => goToStep(1)} className="text-primary hover:underline font-medium flex items-center gap-1 shrink-0">
                                  <Pencil className="w-3 h-3" /> Modifier
                                </button>
                              </div>
                              <div className="flex items-start justify-between gap-2">
                                <p>Demande : <span className="text-on-surface">{STEP3_LABELS[formValues.typeDemande] ?? formValues.typeDemande}</span>
                                  {(formValues.typeDemande === 'livraison' || formValues.typeDemande === 'livraison_decharge') && formValues.adresseLivraison && <span> · {formValues.adresseLivraison}</span>}
                                  {formValues.dateSouhaitee && <span> · {formatDate(formValues.dateSouhaitee)}</span>}
                                </p>
                                <button type="button" onClick={() => goToStep(2)} className="text-primary hover:underline font-medium flex items-center gap-1 shrink-0">
                                  <Pencil className="w-3 h-3" /> Modifier
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Étape 2 — Projet */}
                      {currentStep === 2 && (
                        <SectionDemande
                          register={register}
                          errors={errors}
                          watch={watch}
                          setValue={setValue}
                          onTypeSelect={() => setTypeDemandeChosen(true)}
                        />
                      )}

                      {/* Étape 3 — Matériaux */}
                      {currentStep === 3 && (
                        <>
                          <SectionMateriaux lignes={lignes} setLignes={setLignes} typeDemande={watch('typeDemande')} onNext={handleNext} activeTab={combiTab} onActiveTabChange={setCombiTab} />
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
                              {formValues.typeDemande === 'livraison' && <><Truck className="w-4 h-4 text-primary shrink-0" /> Livraison sur chantier</>}
                              {formValues.typeDemande === 'fourniture' && <><Package className="w-4 h-4 text-primary shrink-0" /> Enlèvement carrière</>}
                              {formValues.typeDemande === 'decharge' && <><ArrowDownToLine className="w-4 h-4 text-primary shrink-0" /> Dépôt de déblais</>}
                              {formValues.typeDemande === 'livraison_decharge' && (
                                <span className="flex items-center gap-1.5">
                                  <Package className="w-4 h-4 text-primary shrink-0" />
                                  <Trash2 className="w-4 h-4 text-purple-500 shrink-0" />
                                  Livraison + Décharge (aller-retour)
                                </span>
                              )}
                            </p>
                            {(formValues.typeDemande === 'livraison' || formValues.typeDemande === 'livraison_decharge') && formValues.adresseLivraison && (
                              <p className="text-secondary text-xs">{formValues.adresseLivraison}</p>
                            )}
                            {(formValues.typeDemande === 'livraison' || formValues.typeDemande === 'livraison_decharge') && formValues.camionLivraison && (
                              <p className="text-secondary text-xs">
                                Camion : {formValues.camionLivraison === 'auto' ? 'Laissé au choix de MIDALI' : (CAMIONS_LIVRAISON.find(c => c.id === formValues.camionLivraison)?.nom ?? formValues.camionLivraison)}
                              </p>
                            )}
                            {formValues.typeDemande === 'livraison_decharge' && formValues.enginChantier && (
                              <p className="text-secondary text-xs">Engin : {formValues.enginChantier}</p>
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
                            <span className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary">
                              {formValues.typeDemande === 'livraison_decharge' ? 'Matériaux & Déblais' : 'Matériaux'}
                            </span>
                            <button
                              type="button"
                              onClick={() => goToStep(3)}
                              className="text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                          </div>
                          {formValues.typeDemande === 'livraison_decharge' ? (
                            <div className="space-y-3">
                              {/* Lignes livraison */}
                              {selectedMateriaux.filter(m => m.type === 'livraison').length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1">
                                    <Package className="w-3 h-3" /> À livrer
                                  </p>
                                  <ul className="space-y-1.5">
                                    {selectedMateriaux.filter(m => m.type === 'livraison').map((m, i) => (
                                      <li key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-on-surface">{m.nom}</span>
                                        <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full text-xs">{m.quantite} t</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {/* Lignes décharge */}
                              {selectedMateriaux.filter(m => m.type === 'decharge').length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1.5 flex items-center gap-1">
                                    <Trash2 className="w-3 h-3" /> À récupérer
                                  </p>
                                  <ul className="space-y-1.5">
                                    {selectedMateriaux.filter(m => m.type === 'decharge').map((m, i) => (
                                      <li key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-on-surface">{m.nom}</span>
                                        <span className="font-bold text-purple-600 bg-purple-500/10 px-2.5 py-0.5 rounded-full text-xs">{m.quantite} t</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <ul className="space-y-1.5">
                              {selectedMateriaux.map((m, i) => (
                                <li key={i} className="flex justify-between items-center text-sm">
                                  <span className="text-on-surface">{m.nom}</span>
                                  <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full text-xs">{m.quantite} t</span>
                                </li>
                              ))}
                            </ul>
                          )}
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

                      <div className="flex items-center justify-center gap-4 mb-4 text-xs text-secondary font-body">
                        <span className="flex items-center gap-1"><span className="text-green-600">✓</span> Devis gratuit</span>
                        <span className="flex items-center gap-1"><span className="text-green-600">✓</span> Sans engagement</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold px-12 py-5 rounded-md hover:shadow-xl active:scale-[0.98] transition-all uppercase tracking-tighter text-base md:text-xl"
                      >
                        {isSubmitting ? 'Envoi en cours...' : 'Obtenir mon devis →'}
                      </button>
                      <div className="space-y-2 mt-3">
                        <p className="text-xs text-secondary text-center max-w-xs mx-auto">
                          Vos données restent confidentielles et servent uniquement à l'établissement de votre devis par MIDALI - TVM38.
                        </p>
                        <p className="text-xs text-secondary text-center max-w-xs mx-auto">
                          Réponse par email : sous 48h (selon disponibilité des stocks).
                        </p>
                      </div>
                    </div>
                  )}

                    </div>
                  )}

                  {/* Boutons de navigation */}
                  {currentStep < 4 && (
                    <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 border-t border-border bg-surface/95 backdrop-blur-sm md:static md:inset-auto md:z-auto md:mt-10 md:pt-6 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none">
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
                        {currentStep === 1 && 'Votre demande →'}
                        {currentStep === 2 && 'Choisir les matériaux →'}
                        {currentStep === 3 && (watch('typeDemande') === 'livraison_decharge' && combiTab === 'livraison' ? 'Passer à la décharge →' : 'Vérifier ma demande →')}
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

      <Footer />
      <Toaster richColors position="top-center" />
    </div>
  );
}
