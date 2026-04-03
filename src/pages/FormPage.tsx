import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DevisFormData, LigneDevis } from '@/types';
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';

import Header from '@/components/layout/Header';
import SectionClient from '@/components/form/SectionClient';
import SectionDemande from '@/components/form/SectionDemande';
import SectionMateriaux from '@/components/form/SectionMateriaux';
import SectionNotes from '@/components/form/SectionNotes';
import { MATERIAUX } from '@/data/materiaux';

// Validation schema
const schema = z.object({
  dejaClient: z.enum(['oui', 'non']),
  typeClient: z.enum(['professionnel', 'particulier']),
  entrepriseNom: z.string().optional(),
  entrepriseAdresse: z.string().optional(),
  nom: z.string().min(2, 'Nom requis'),
  prenom: z.string().min(2, 'Prénom requis'),
  telephone: z.string()
    .min(10, 'Numéro invalide')
    .regex(/^[0-9\s\+\-\.\(\)]{10,}$/, 'Format invalide'),
  email: z.string().email('Adresse email invalide'),
  typeDemande: z.enum(['livraison', 'fourniture']),
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
  documents: z.array(z.any()).optional(),
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

export default function FormPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<DevisFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      dejaClient: 'non',
      typeClient: 'professionnel',
      typeDemande: 'livraison',
      creneau: 'indifferent',
      lignes: [],
      documents: [],
    },
  });
  const [lignes, setLignes] = useState<LigneDevis[]>([]);

  const formatDate = (iso?: string) => {
    if (!iso) return 'Non précisée';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    setValue('lignes', lignes);
  }, [lignes, setValue]);

  const onSubmit = async (data: DevisFormData) => {
    try {
      const materailsSummary = (data.lignes || [])
        .map((l: any) => {
          const mat = MATERIAUX.find(m => m.id === l.materiauId);
          return `- ${mat?.nom ?? l.materiauId} : ${l.quantiteTonnes}t (${l.quantiteM3}m³)`;
        })
        .join('\n');

      const formData = {
        access_key: import.meta.env.VITE_WEB3FORMS_KEY,
        from_name: "MIDALI - TVM38 DEVIS",
        subject: `DEMANDE DEVIS : ${data.entrepriseNom || (data.prenom + ' ' + data.nom)}`,
        "1. NOM CLIENT": `${data.prenom} ${data.nom}`,
        "2. CONTACT": `${data.email} | ${data.telephone}`,
        "3. TYPE CLIENT": data.typeClient === 'professionnel' ? 'Profil Professionnel' : 'Profil Particulier',
        "4. SOCIETE": data.entrepriseNom || 'N/A',
        "5. ADRESSE SIEGE": data.entrepriseAdresse || 'N/A',
        "---": "-----------",
        "6. DEMANDE": data.typeDemande === 'livraison' ? 'LIVRAISON avec transport' : 'FOURNITURE uniquement',
        "7. ADRESSE CHANTIER": data.adresseLivraison || 'N/A',
        "8. PLANIFICATION": `Le ${formatDate(data.dateSouhaitee)} (Créneau : ${data.creneau})`,
        "--- ": "----------- ",
        "9. MATERIAUX": materailsSummary || 'Aucun matériau sélectionné',
        "10. NOTES CLIENT": data.notes || 'Aucune note',
        replyto: data.email,
      };

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (result.success) {
        navigate('/merci');
      } else {
        throw new Error(result.message);
      }
    } catch {
      toast.error("Erreur d'envoi. Veuillez réessayer.");
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <main className="pt-24 pb-16">
        
        {/* Hero Section */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-8 mb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <h1 className="text-5xl md:text-7xl font-headline font-black tracking-tighter text-on-surface mb-6 uppercase leading-none">
              Votre demande de devis <br/><span className="text-primary">en ligne</span>
            </h1>
            <p className="text-lg text-secondary max-w-2xl font-body">
              Vos matériaux, votre livraison, <span className="text-primary font-bold tracking-tight">votre devis</span>. Recevez une proposition détaillée rapidement pour tous vos projets de travaux.
            </p>
          </div>
          <div className="lg:col-span-4 hidden lg:block">
            <div className="bg-surface-container p-6 rounded-lg">
              <span className="font-label text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Statut du Service</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold">Opérationnel - Livraison 38/69/01</span>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Left Box */}
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
                <h3 className="font-headline font-bold text-xl mb-4">Pourquoi nous choisir ?</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-4">
                    <span className="text-primary font-bold uppercase tracking-tighter text-lg min-w-[100px] shrink-0">Rapidité</span>
                    <span className="text-sm font-medium leading-tight">Traitement prioritaire de vos demandes pour ne pas ralentir vos chantiers.</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-primary font-bold uppercase tracking-tighter text-lg min-w-[100px] shrink-0">Locale</span>
                    <span className="text-sm font-medium leading-tight">Vous choisissez une société familiale implantée dans le Grésivaudan depuis 1937.</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-primary font-bold uppercase tracking-tighter text-lg min-w-[100px] shrink-0">Conforme</span>
                    <span className="text-sm font-medium leading-tight">Matériaux certifiés conformes aux normes CE.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-2">
              <div className="bg-surface-container-lowest p-6 md:p-12 shadow-sm rounded-xl">
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-12">
                  <SectionClient register={register} errors={errors} watch={watch} setValue={setValue} />
                  <SectionDemande register={register} errors={errors} watch={watch} setValue={setValue} />
                  <SectionMateriaux lignes={lignes} setLignes={setLignes} />
                  {errors.lignes && (
                    <p className="text-sm text-destructive font-medium bg-error-container p-3 rounded-lg border border-destructive/20 mb-4">
                      {errors.lignes.message as string}
                    </p>
                  )}
                  <SectionNotes register={register} setValue={setValue} />
                  
                  <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-border mt-8 pt-8">
                    <p className="text-xs text-secondary max-w-xs">En envoyant ce formulaire, vous acceptez que vos données soient traitées par MIDALI - TVM38 pour l'établissement de votre devis.</p>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-auto bg-industrial-gradient text-on-primary font-headline font-extrabold px-12 py-5 rounded-md hover:shadow-xl active:scale-[0.98] transition-all uppercase tracking-tighter text-base md:text-xl"
                    >
                      {isSubmitting ? 'Envoi...' : 'Envoyer ma demande'}
                    </button>
                  </div>
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
            <a className="font-body text-sm text-secondary hover:text-primary transition-colors" href="https://tvm38estimation.netlify.app/" target="_blank" rel="noopener">Laisser un avis</a>
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
