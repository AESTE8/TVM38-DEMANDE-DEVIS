import { FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  ChevronLeft,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClientBadge from '@/components/ClientBadge';
import { ClientData, getConnectedClient } from '@/lib/auth';
import { cn, formatPhoneInput } from '@/lib/utils';
import { fetchProfil, modifierProfil, ProfilSessionExpiree } from '@/lib/profile';

type Contact = NonNullable<ClientData['contacts']>[number];
type Agence = NonNullable<ClientData['agences']>[number];

const contactVide = { nom: '', prenom: '', fonction: '', telephone: '', email: '' };
const agenceVide = { nom: '', adresse: '' };

function ChampLecture({ label, valeur }: { label: string; valeur?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-container-low/55 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-on-surface">{valeur || '—'}</p>
    </div>
  );
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-on-surface">{children}</label>;
}

const inputClass = 'min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-on-surface outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-surface-container-low disabled:text-secondary';

export default function ProfilPage() {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(() => getConnectedClient());
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [coordonnees, setCoordonnees] = useState({ nom: '', prenom: '', telephone: '', email: '', adresse: '' });
  const [contactEdition, setContactEdition] = useState<Contact | 'nouveau' | null>(null);
  const [contactForm, setContactForm] = useState(contactVide);
  const [agenceEdition, setAgenceEdition] = useState<Agence | 'nouvelle' | null>(null);
  const [agenceForm, setAgenceForm] = useState(agenceVide);

  function synchroniser(profil: ClientData) {
    setClient(profil);
    setCoordonnees({
      nom: profil.nom ?? '',
      prenom: profil.prenom ?? '',
      telephone: profil.telephone ?? '',
      email: profil.email ?? '',
      adresse: profil.adresse ?? '',
    });
  }

  useEffect(() => {
    document.title = 'Mes informations — TVM38';
    fetchProfil()
      .then(synchroniser)
      .catch((error) => {
        if (error instanceof ProfilSessionExpiree) navigate('/', { replace: true });
        else toast.error('Impossible de charger vos informations.');
      })
      .finally(() => setChargement(false));
  }, [navigate]);

  async function executer(operation: string, data: Record<string, unknown>, message: string) {
    setActionEnCours(operation);
    try {
      const profil = await modifierProfil(operation, data);
      synchroniser(profil);
      toast.success(message);
      return true;
    } catch (error) {
      if (error instanceof ProfilSessionExpiree) {
        navigate('/', { replace: true });
      } else {
        toast.error("La modification n'a pas pu être enregistrée.");
      }
      return false;
    } finally {
      setActionEnCours(null);
    }
  }

  async function sauvegarderCoordonnees(event: FormEvent) {
    event.preventDefault();
    const data: Record<string, unknown> = {
      telephone: coordonnees.telephone,
      email: coordonnees.email,
      adresse: coordonnees.adresse,
    };
    if (client?.type === 'particulier') {
      data.nom = coordonnees.nom;
      data.prenom = coordonnees.prenom;
    }
    await executer('update_profile', data, 'Vos coordonnées ont été mises à jour.');
  }

  function ouvrirContact(contact: Contact | 'nouveau') {
    setContactEdition(contact);
    setContactForm(contact === 'nouveau' ? contactVide : {
      nom: contact.nom ?? '',
      prenom: contact.prenom ?? '',
      fonction: contact.fonction ?? '',
      telephone: contact.telephone ?? '',
      email: contact.email ?? '',
    });
  }

  async function sauvegarderContact(event: FormEvent) {
    event.preventDefault();
    if (!contactEdition || !contactForm.nom.trim()) return;
    const nouveau = contactEdition === 'nouveau';
    const ok = await executer(
      nouveau ? 'add_contact' : 'update_contact',
      { ...contactForm, id: nouveau ? crypto.randomUUID() : contactEdition.id },
      nouveau ? 'Le contact a été ajouté.' : 'Le contact a été modifié.',
    );
    if (ok) setContactEdition(null);
  }

  function ouvrirAgence(agence: Agence | 'nouvelle') {
    setAgenceEdition(agence);
    setAgenceForm(agence === 'nouvelle' ? agenceVide : {
      nom: agence.nom ?? '',
      adresse: agence.adresse ?? '',
    });
  }

  async function sauvegarderAgence(event: FormEvent) {
    event.preventDefault();
    if (!agenceEdition || !agenceForm.nom.trim()) return;
    const nouvelle = agenceEdition === 'nouvelle';
    const ok = await executer(
      nouvelle ? 'add_agence' : 'update_agence',
      { ...agenceForm, id: nouvelle ? crypto.randomUUID() : agenceEdition.id },
      nouvelle ? "L'agence a été ajoutée." : "L'agence a été modifiée.",
    );
    if (ok) setAgenceEdition(null);
  }

  const estProfessionnel = client?.type !== 'particulier';

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header>{client && <ClientBadge />}</Header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24 sm:px-6 md:pt-28">
        <Link to="/espace" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-secondary transition hover:text-primary">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Retour à mes dossiers
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Espace personnel</p>
            <h1 className="mt-2 font-headline text-3xl font-black tracking-tight text-on-surface sm:text-4xl">Mes informations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">Gérez les coordonnées utilisées pour vos prochaines demandes et vos échanges avec TVM38.</p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-white p-1 shadow-sm">
            <Link to="/espace" className="inline-flex min-h-10 items-center rounded-md px-4 text-xs font-bold text-secondary hover:text-primary">Mes dossiers</Link>
            <span className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-xs font-bold text-white">Mes informations</span>
          </div>
        </div>

        {chargement ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-white py-24" aria-live="polite">
            <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin text-primary" />
            <span className="sr-only">Chargement de vos informations</span>
          </div>
        ) : client ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-border/75 bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/55 bg-surface-container-low px-5 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-headline text-lg font-black text-on-surface">Mon compte</h2>
                  <p className="text-xs text-secondary">Informations administratives TVM38</p>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <ChampLecture label={estProfessionnel ? 'Raison sociale' : 'Titulaire du compte'} valeur={estProfessionnel ? client.nom : `${client.prenom ?? ''} ${client.nom}`.trim()} />
                <ChampLecture label="Code client" valeur={client.code} />
                <ChampLecture label="Type de compte" valeur={estProfessionnel ? 'Professionnel' : 'Particulier'} />
              </div>
              {estProfessionnel && <p className="px-5 pb-5 text-xs text-secondary">Pour corriger la raison sociale, contactez TVM38 afin de préserver la cohérence des documents commerciaux.</p>}
            </section>

            <section className="rounded-2xl border border-border/75 bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700"><UserRound className="h-5 w-5" /></span>
                <div><h2 className="font-headline text-lg font-black text-on-surface">Coordonnées générales</h2><p className="text-xs text-secondary">Utilisées pour préremplir vos prochaines demandes</p></div>
              </div>
              <form onSubmit={sauvegarderCoordonnees} className="space-y-4">
                {!estProfessionnel && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="profil-prenom">Prénom</Label><input id="profil-prenom" className={inputClass} value={coordonnees.prenom} onChange={(e) => setCoordonnees((v) => ({ ...v, prenom: e.target.value }))} /></div>
                    <div><Label htmlFor="profil-nom">Nom</Label><input id="profil-nom" required className={inputClass} value={coordonnees.nom} onChange={(e) => setCoordonnees((v) => ({ ...v, nom: e.target.value }))} /></div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="profil-telephone">Téléphone principal</Label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondary" /><input id="profil-telephone" type="tel" className={cn(inputClass, 'pl-10')} value={coordonnees.telephone} onChange={(e) => setCoordonnees((v) => ({ ...v, telephone: formatPhoneInput(e.target.value) }))} /></div></div>
                  <div><Label htmlFor="profil-email">Email principal</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondary" /><input id="profil-email" type="email" className={cn(inputClass, 'pl-10')} value={coordonnees.email} onChange={(e) => setCoordonnees((v) => ({ ...v, email: e.target.value }))} /></div></div>
                </div>
                <div><Label htmlFor="profil-adresse">Adresse principale</Label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondary" /><input id="profil-adresse" className={cn(inputClass, 'pl-10')} value={coordonnees.adresse} onChange={(e) => setCoordonnees((v) => ({ ...v, adresse: e.target.value }))} /></div></div>
                <div className="flex justify-end"><button disabled={actionEnCours !== null} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:opacity-60">{actionEnCours === 'update_profile' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Enregistrer</button></div>
              </form>
            </section>

            {estProfessionnel && (
              <>
                <section className="rounded-2xl border border-border/75 bg-card p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><UsersRound className="h-5 w-5" /></span><div><h2 className="font-headline text-lg font-black text-on-surface">Mes contacts</h2><p className="text-xs text-secondary">Personnes pouvant effectuer une demande</p></div></div>
                    <button type="button" onClick={() => ouvrirContact('nouveau')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 px-3 text-xs font-bold text-primary hover:bg-primary/5"><Plus className="h-4 w-4" />Ajouter</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(client.contacts ?? []).map((contact) => (
                      <article key={contact.id} className="rounded-xl border border-border/70 bg-surface-container-low/35 p-4">
                        <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-on-surface">{contact.prenom} {contact.nom}</p>{contact.principal && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">Principal</span>}</div><p className="mt-1 text-xs text-secondary">{contact.fonction || 'Contact'}</p></div><button type="button" onClick={() => ouvrirContact(contact)} className="grid h-10 w-10 place-items-center rounded-lg text-secondary hover:bg-white hover:text-primary" aria-label={`Modifier ${contact.prenom ?? ''} ${contact.nom}`}><Pencil className="h-4 w-4" /></button></div>
                        <div className="mt-3 space-y-1 text-xs text-secondary">{contact.telephone && <p>{contact.telephone}</p>}{contact.email && <p className="break-all">{contact.email}</p>}</div>
                        <div className="mt-4 flex flex-wrap gap-2">{!contact.principal && <button type="button" disabled={actionEnCours !== null} onClick={() => executer('set_primary_contact', { id: contact.id }, 'Le contact principal a été mis à jour.')} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-bold text-on-surface hover:border-amber-400"><Star className="h-3.5 w-3.5 text-amber-600" />Définir principal</button>}<button type="button" disabled={actionEnCours !== null} onClick={() => { if (window.confirm('Supprimer ce contact ?')) executer('delete_contact', { id: contact.id }, 'Le contact a été supprimé.'); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" />Supprimer</button></div>
                      </article>
                    ))}
                    {(client.contacts?.length ?? 0) === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-secondary sm:col-span-2">Aucun contact enregistré.</p>}
                  </div>
                  {contactEdition && <form onSubmit={sauvegarderContact} className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.035] p-4"><h3 className="mb-4 font-headline font-black text-on-surface">{contactEdition === 'nouveau' ? 'Ajouter un contact' : 'Modifier le contact'}</h3><div className="grid gap-4 sm:grid-cols-2"><div><Label>Prénom</Label><input className={inputClass} value={contactForm.prenom} onChange={(e) => setContactForm((v) => ({ ...v, prenom: e.target.value }))} /></div><div><Label>Nom</Label><input required className={inputClass} value={contactForm.nom} onChange={(e) => setContactForm((v) => ({ ...v, nom: e.target.value }))} /></div><div><Label>Fonction</Label><input className={inputClass} value={contactForm.fonction} onChange={(e) => setContactForm((v) => ({ ...v, fonction: e.target.value }))} /></div><div><Label>Téléphone</Label><input className={inputClass} value={contactForm.telephone} onChange={(e) => setContactForm((v) => ({ ...v, telephone: formatPhoneInput(e.target.value) }))} /></div><div className="sm:col-span-2"><Label>Email</Label><input type="email" className={inputClass} value={contactForm.email} onChange={(e) => setContactForm((v) => ({ ...v, email: e.target.value }))} /></div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setContactEdition(null)} className="min-h-11 rounded-lg px-4 text-sm font-bold text-secondary">Annuler</button><button disabled={actionEnCours !== null} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-black text-white">Enregistrer</button></div></form>}
                </section>

                <section className="rounded-2xl border border-border/75 bg-card p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700"><Building2 className="h-5 w-5" /></span><div><h2 className="font-headline text-lg font-black text-on-surface">Mes agences et adresses</h2><p className="text-xs text-secondary">Sites proposés lors d'une nouvelle demande</p></div></div><button type="button" onClick={() => ouvrirAgence('nouvelle')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 px-3 text-xs font-bold text-primary hover:bg-primary/5"><Plus className="h-4 w-4" />Ajouter</button></div>
                  <div className="space-y-3">{(client.agences ?? []).map((agence) => <article key={agence.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-container-low/35 p-4"><div><p className="font-bold text-on-surface">{agence.nom}</p><p className="mt-1 text-xs leading-relaxed text-secondary">{agence.adresse || 'Adresse non renseignée'}</p></div><div className="flex"><button type="button" onClick={() => ouvrirAgence(agence)} className="grid h-10 w-10 place-items-center rounded-lg text-secondary hover:bg-white hover:text-primary" aria-label={`Modifier ${agence.nom}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { if (window.confirm(`Supprimer l'agence « ${agence.nom} » ?`)) executer('delete_agence', { id: agence.id }, "L'agence a été supprimée."); }} className="grid h-10 w-10 place-items-center rounded-lg text-secondary hover:bg-destructive/5 hover:text-destructive" aria-label={`Supprimer ${agence.nom}`}><Trash2 className="h-4 w-4" /></button></div></article>)}{(client.agences?.length ?? 0) === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-secondary">Aucune agence enregistrée.</p>}</div>
                  {agenceEdition && <form onSubmit={sauvegarderAgence} className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.035] p-4"><h3 className="mb-4 font-headline font-black text-on-surface">{agenceEdition === 'nouvelle' ? 'Ajouter une agence' : "Modifier l'agence"}</h3><div className="space-y-4"><div><Label>Nom de l'agence</Label><input required className={inputClass} value={agenceForm.nom} onChange={(e) => setAgenceForm((v) => ({ ...v, nom: e.target.value }))} /></div><div><Label>Adresse</Label><input className={inputClass} value={agenceForm.adresse} onChange={(e) => setAgenceForm((v) => ({ ...v, adresse: e.target.value }))} /></div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setAgenceEdition(null)} className="min-h-11 rounded-lg px-4 text-sm font-bold text-secondary">Annuler</button><button disabled={actionEnCours !== null} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-black text-white">Enregistrer</button></div></form>}
                </section>
              </>
            )}

            <section className="rounded-2xl border border-border/75 bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-container text-secondary"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-headline text-lg font-black text-on-surface">Sécurité</h2><p className="text-xs text-secondary">Informations de connexion en lecture seule</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="profil-identifiant">Identifiant client</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondary" /><input id="profil-identifiant" readOnly className={cn(inputClass, 'pl-10')} value={client.identifiant || client.code} /></div></div><div><Label htmlFor="profil-password">Mot de passe</Label><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondary" /><input id="profil-password" readOnly type="password" className={cn(inputClass, 'pl-10')} value="mot-de-passe" /></div></div></div>
              <p className="mt-3 text-xs text-secondary">Ces informations ne peuvent pas être modifiées depuis l'espace personnel. Contactez TVM38 en cas de problème d'accès.</p>
            </section>
          </div>
        ) : null}
      </main>

      <Footer compact />
    </div>
  );
}
