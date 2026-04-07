import { useState, forwardRef, useImperativeHandle } from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { DevisFormData } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// RadioGroup/RadioGroupItem gardé pour le sélecteur typeClient
import { cn } from '@/lib/utils';
import AddressAutocomplete from '../ui/AddressAutocomplete';
import CompanyAutocomplete from '../ui/CompanyAutocomplete';
import { supabase } from '@/lib/supabase';

interface Props {
  register: UseFormRegister<DevisFormData>;
  errors: FieldErrors<DevisFormData>;
  watch: UseFormWatch<DevisFormData>;
  setValue: UseFormSetValue<DevisFormData>;
}

export interface SectionClientHandle {
  saveNewContactIfNeeded: (formData: DevisFormData) => Promise<void>;
  saveNewAgenceIfNeeded: (formData: DevisFormData) => Promise<void>;
  updateClientInfoIfChanged: (formData: DevisFormData) => Promise<void>;
  updateExistingContactIfChanged: (formData: DevisFormData) => Promise<void>;
  updateExistingAgenceIfChanged: () => Promise<void>;
}

const SectionClient = forwardRef<SectionClientHandle, Props>(
  ({ register, errors, watch, setValue }, ref) => {
    const typeClient = watch('typeClient');
    const dejaClient = watch('dejaClient');
    const entrepriseAdresse = watch('entrepriseAdresse') || '';

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [companyContacts, setCompanyContacts] = useState<any[]>([]);
    const [companyAgences, setCompanyAgences] = useState<any[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

    // Amélioration 1 — Nouvelle agence inline
    const [showNewAgence, setShowNewAgence] = useState(false);
    const [newAgenceNom, setNewAgenceNom] = useState('');
    const [newAgenceAdresse, setNewAgenceAdresse] = useState('');

    // Modification agence existante
    const [selectedAgenceId, setSelectedAgenceId] = useState<string | null>(null);
    const [originalAgence, setOriginalAgence] = useState<{ nom: string; adresse: string } | null>(null);
    const [editedAgenceNom, setEditedAgenceNom] = useState('');
    const [editedAgenceAdresse, setEditedAgenceAdresse] = useState('');
    const [editingAgence, setEditingAgence] = useState(false);

    // Ouverture de compte
    const [showDemandeCompte, setShowDemandeCompte] = useState(false);
    const [emailDemandeCompte, setEmailDemandeCompte] = useState('');
    const [sendingDemandeCompte, setSendingDemandeCompte] = useState(false);
    const [demandeCompteSent, setDemandeCompteSent] = useState(false);

    // Amélioration 2 — Snapshot infos client + mode édition
    const [originalClient, setOriginalClient] = useState<{
      telephone: string;
      email: string;
      adresse: string;
    } | null>(null);
    const [editingPhone, setEditingPhone] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [editingAdresse, setEditingAdresse] = useState(false);

    useImperativeHandle(ref, () => ({
      saveNewContactIfNeeded: async (formData: DevisFormData) => {
        if (!selectedClientId || selectedContactId !== 'nouveau' || dejaClient !== 'oui') return;

        const nouveauContact = {
          id: crypto.randomUUID(),
          nom: formData.nom || '',
          prenom: formData.prenom || '',
          telephone: formData.telephone,
          email: formData.email,
          fonction: formData.fonction || '',
        };

        const { data: clientData } = await supabase
          .from('clients')
          .select('contacts')
          .eq('id', selectedClientId)
          .single();

        const contactsExistants = clientData?.contacts || [];

        await supabase
          .from('clients')
          .update({ contacts: [...contactsExistants, nouveauContact] })
          .eq('id', selectedClientId);
      },

      saveNewAgenceIfNeeded: async (_formData: DevisFormData) => {
        if (!showNewAgence || !newAgenceNom || !selectedClientId) return;

        const nouvelleAgence = {
          id: crypto.randomUUID(),
          nom: newAgenceNom,
          adresse: newAgenceAdresse,
        };

        const { data: clientData } = await supabase
          .from('clients')
          .select('agences')
          .eq('id', selectedClientId)
          .single();

        const agencesExistantes = clientData?.agences || [];

        await supabase
          .from('clients')
          .update({ agences: [...agencesExistantes, nouvelleAgence] })
          .eq('id', selectedClientId);
      },

      updateClientInfoIfChanged: async (formData: DevisFormData) => {
        // Si un contact spécifique est sélectionné, ne pas écraser les infos racine de l'entreprise
        // avec les valeurs du contact — c'est updateExistingContactIfChanged qui s'en charge.
        if (!selectedClientId || !originalClient || selectedContactId !== null) return;

        const adresse = formData.entrepriseAdresse || '';

        const hasChanged = adresse !== originalClient.adresse;

        if (!hasChanged) return;

        await supabase
          .from('clients')
          .update({ adresse })
          .eq('id', selectedClientId);
      },

      updateExistingAgenceIfChanged: async () => {
        if (!selectedClientId || !selectedAgenceId || !originalAgence || !editingAgence) return;

        const hasChanged =
          editedAgenceNom !== originalAgence.nom ||
          editedAgenceAdresse !== originalAgence.adresse;

        if (!hasChanged) return;

        const { data: clientData } = await supabase
          .from('clients')
          .select('agences')
          .eq('id', selectedClientId)
          .single();

        const agences: any[] = clientData?.agences || [];
        const updated = agences.map((a: any) =>
          a.id === selectedAgenceId
            ? { ...a, nom: editedAgenceNom, adresse: editedAgenceAdresse }
            : a
        );

        await supabase
          .from('clients')
          .update({ agences: updated })
          .eq('id', selectedClientId);
      },

      updateExistingContactIfChanged: async (formData: DevisFormData) => {
        if (!selectedClientId || !selectedContactId || selectedContactId === 'nouveau' || dejaClient !== 'oui') return;

        const { data: clientData } = await supabase
          .from('clients')
          .select('contacts')
          .eq('id', selectedClientId)
          .single();

        const contacts: any[] = clientData?.contacts || [];
        const contact = contacts.find((c: any) => c.id === selectedContactId);
        if (!contact) return;

        const newNom = formData.nom || '';
        const newPrenom = formData.prenom || '';
        // Normaliser null → '' pour la comparaison
        const contactNom = contact.nom ?? '';
        const contactPrenom = contact.prenom ?? '';
        const contactTel = contact.telephone ?? '';
        const contactEmail = contact.email ?? '';
        const hasChanged =
          contactNom !== newNom ||
          contactPrenom !== newPrenom ||
          contactTel !== (formData.telephone || '') ||
          contactEmail !== (formData.email || '');

        if (!hasChanged) return;

        const updated = contacts.map((c: any) =>
          c.id === selectedContactId
            ? { ...c, nom: newNom, prenom: newPrenom, telephone: formData.telephone || '', email: formData.email || '' }
            : c
        );

        await supabase
          .from('clients')
          .update({ contacts: updated })
          .eq('id', selectedClientId);
      },
    }));

    return (
      <div>
        <div className="flex items-center gap-4 mb-8">
          <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">01</span>
          <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">Coordonnées</h2>
        </div>

        <div className="space-y-8">
          {/* Type de client */}
          <div>
            <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-3">Vous êtes</Label>
            <RadioGroup
              value={typeClient}
              onValueChange={(val: 'professionnel' | 'particulier') => setValue('typeClient', val, { shouldValidate: true })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professionnel" id="pro" className="border-primary text-primary" />
                <Label htmlFor="pro" className="font-medium cursor-pointer text-sm font-body">Professionnel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="particulier" id="part" className="border-primary text-primary" />
                <Label htmlFor="part" className="font-medium cursor-pointer text-sm font-body">Particulier</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Compte Existant */}
          <div>
            <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-3">Avez-vous déjà un compte chez TVM38 ?</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'oui', title: 'Oui', desc: "J'ai déjà un compte TVM38" },
                { val: 'non', title: 'Non', desc: "Je n'ai pas encore de compte" },
              ].map(({ val, title, desc }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setValue('dejaClient', val as 'oui' | 'non')}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    dejaClient === val
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-surface-container-highest hover:border-primary/30"
                  )}
                >
                  <div className={cn("font-bold text-sm mb-0.5", dejaClient === val ? "text-primary" : "text-on-surface")}>{title}</div>
                  <div className="text-xs text-secondary leading-tight">{desc}</div>
                </button>
              ))}
            </div>

            {dejaClient === 'non' && (
              <div className="mt-4 animate-fade-in">
                {!showDemandeCompte && !demandeCompteSent && (
                  <button
                    type="button"
                    onClick={() => setShowDemandeCompte(true)}
                    className="w-full py-3 px-4 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary font-medium text-sm hover:bg-primary/10 transition-colors"
                  >
                    Demander votre ouverture de compte gratuite
                  </button>
                )}

                {showDemandeCompte && !demandeCompteSent && (
                  <div className="p-4 border border-primary/20 rounded-lg bg-surface-container-highest space-y-3 animate-fade-in">
                    <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block">
                      Ouverture de compte
                    </Label>
                    <div className="space-y-1">
                      <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                        Votre adresse e-mail <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        value={emailDemandeCompte}
                        onChange={(e) => setEmailDemandeCompte(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={sendingDemandeCompte || !emailDemandeCompte}
                        onClick={async () => {
                          if (!emailDemandeCompte) return;
                          setSendingDemandeCompte(true);
                          try {
                            await fetch('https://api.web3forms.com/submit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                access_key: import.meta.env.VITE_WEB3FORMS_KEY,
                                subject: 'Demande d\'ouverture de compte TVM38',
                                email: emailDemandeCompte,
                                message: `Nouvelle demande d'ouverture de compte.\n\nEmail : ${emailDemandeCompte}`,
                              }),
                            });
                            setDemandeCompteSent(true);
                            setShowDemandeCompte(false);
                          } catch {
                            // silencieux
                          } finally {
                            setSendingDemandeCompte(false);
                          }
                        }}
                        className="flex-1 py-2 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingDemandeCompte ? 'Envoi...' : 'Envoyer ma demande'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDemandeCompte(false); setEmailDemandeCompte(''); }}
                        className="py-2 px-3 rounded-lg text-xs text-secondary hover:text-destructive transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {demandeCompteSent && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
                    ✅ Votre demande a bien été envoyée. L'équipe TVM38 vous contactera prochainement.
                  </div>
                )}
              </div>
            )}

            {dejaClient === 'oui' && (
              <div className="mt-4 p-6 bg-surface-container rounded-lg animate-fade-in">
                <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block mb-1">
                  {typeClient === 'professionnel' ? 'Recherchez votre entreprise' : 'Recherchez votre compte client'}
                </Label>
                <CompanyAutocomplete
                  value={watch('entrepriseNom') || ''}
                  onChange={(val) => setValue('entrepriseNom', val)}
                  onSelect={(company) => {
                    setSelectedClientId(company.id || null);
                    setValue('entrepriseNom', company.nom || '', { shouldValidate: true });
                    if (company.adresse) setValue('entrepriseAdresse', company.adresse, { shouldValidate: true });

                    // Snapshot des infos client
                    setOriginalClient({
                      telephone: company.telephone || '',
                      email: company.email || '',
                      adresse: company.adresse || '',
                    });

                    // Réinitialiser l'agence à chaque changement d'entreprise
                    setCompanyAgences([]);
                    setValue('agenceNom', '');
                    setValue('adresseLivraison', '');
                    setShowNewAgence(false);
                    setNewAgenceNom('');
                    setNewAgenceAdresse('');

                    if (company.contacts && Array.isArray(company.contacts) && company.contacts.length > 0) {
                      setCompanyContacts(company.contacts);
                      setSelectedContactId(null);
                    } else {
                      setCompanyContacts([]);
                      setSelectedContactId('nouveau');
                    }

                    if (company.agences && Array.isArray(company.agences) && company.agences.length > 0) {
                      setCompanyAgences(company.agences);
                    }

                    // Pré-remplir depuis les champs racine si pas de contacts JSONB
                    const hasContacts = company.contacts && Array.isArray(company.contacts) && company.contacts.length > 0;
                    setValue('nom', '');
                    setValue('prenom', '');
                    setValue('email', hasContacts ? '' : (company.email || ''), { shouldValidate: !!company.email });
                    setValue('telephone', hasContacts ? '' : (company.telephone || ''), { shouldValidate: !!company.telephone });
                  }}
                  placeholder={typeClient === 'professionnel' ? "Commencez à taper le nom..." : "Tapez votre nom..."}
                  className="mt-2"
                />

                {/* Amélioration 2 — Infos entreprise modifiables */}
                {watch('entrepriseNom') && originalClient && (
                  <div className="mt-4 p-4 bg-surface-container-highest rounded-lg border border-border/40">
                    <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block mb-2">
                      Infos enregistrées — cliquez sur ✏️ pour corriger
                    </Label>
                    <div className="space-y-2">
                      {/* Téléphone */}
                      <div className="flex items-center gap-2 py-1 border-b border-border/20">
                        <span className="text-xs text-secondary w-20 shrink-0">Téléphone</span>
                        {editingPhone ? (
                          <Input
                            className="h-7 text-sm flex-1"
                            value={watch('telephone') || ''}
                            onChange={(e) => setValue('telephone', e.target.value)}
                            onBlur={() => setEditingPhone(false)}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-sm flex-1 text-on-surface">
                              {watch('telephone') || originalClient.telephone || <span className="text-secondary italic">—</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!watch('telephone')) setValue('telephone', originalClient.telephone);
                                setEditingPhone(true);
                              }}
                              className="text-secondary hover:text-primary transition-colors text-sm px-1"
                              title="Modifier le téléphone"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2 py-1 border-b border-border/20">
                        <span className="text-xs text-secondary w-20 shrink-0">Email</span>
                        {editingEmail ? (
                          <Input
                            className="h-7 text-sm flex-1"
                            type="email"
                            value={watch('email') || ''}
                            onChange={(e) => setValue('email', e.target.value)}
                            onBlur={() => setEditingEmail(false)}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-sm flex-1 text-on-surface truncate">
                              {watch('email') || originalClient.email || <span className="text-secondary italic">—</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!watch('email')) setValue('email', originalClient.email);
                                setEditingEmail(true);
                              }}
                              className="text-secondary hover:text-primary transition-colors text-sm px-1 shrink-0"
                              title="Modifier l'email"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>

                      {/* Adresse siège */}
                      <div className="flex items-center gap-2 py-1">
                        <span className="text-xs text-secondary w-20 shrink-0">Adresse</span>
                        {editingAdresse ? (
                          <div className="flex-1">
                            <AddressAutocomplete
                              value={watch('entrepriseAdresse') || ''}
                              onChange={(val) => setValue('entrepriseAdresse', val)}
                              onSelect={(val) => { setValue('entrepriseAdresse', val, { shouldValidate: true }); setEditingAdresse(false); }}
                              placeholder="Rechercher l'adresse..."
                            />
                          </div>
                        ) : (
                          <>
                            <span className="text-sm flex-1 text-on-surface truncate">
                              {watch('entrepriseAdresse') || originalClient.adresse || <span className="text-secondary italic">—</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!watch('entrepriseAdresse')) setValue('entrepriseAdresse', originalClient.adresse);
                                setEditingAdresse(true);
                              }}
                              className="text-secondary hover:text-primary transition-colors text-sm px-1 shrink-0"
                              title="Modifier l'adresse"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sélecteur de site / agence */}
                {watch('entrepriseNom') && companyAgences.length > 0 && (
                  <div className="mt-4 animate-fade-in">
                    <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block mb-2">
                      Choisir une agence
                    </Label>
                    <select
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary/30"
                      defaultValue=""
                      onChange={(e) => {
                        const agence = companyAgences.find(a => a.id === e.target.value);
                        if (agence) {
                          const adresse = agence.adresse || agence.adresseStructuree?.rue || '';
                          setValue('adresseLivraison', adresse, { shouldValidate: true });
                          setValue('agenceNom', agence.nom || '');
                          setShowNewAgence(false);
                          setSelectedAgenceId(agence.id);
                          setOriginalAgence({ nom: agence.nom || '', adresse });
                          setEditedAgenceNom(agence.nom || '');
                          setEditedAgenceAdresse(adresse);
                          setEditingAgence(false);
                        }
                      }}
                    >
                      <option value="" disabled>-- Sélectionnez votre agence --</option>
                      {companyAgences.map((agence: any) => (
                        <option key={agence.id} value={agence.id}>
                          {agence.nom} {agence.adresse ? `— ${agence.adresse}` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Édition agence sélectionnée */}
                    {selectedAgenceId && !showNewAgence && (
                      <div className="mt-2">
                        {!editingAgence ? (
                          <button
                            type="button"
                            onClick={() => setEditingAgence(true)}
                            className="text-xs text-primary/60 hover:text-primary underline underline-offset-2 transition-colors"
                          >
                            ✏️ Modifier les infos de cette agence
                          </button>
                        ) : (
                          <div className="mt-2 p-4 border border-primary/20 rounded-lg bg-surface-container-highest space-y-3 animate-fade-in">
                            <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block">
                              Modifier l'agence
                            </Label>
                            <div className="space-y-1">
                              <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Nom</Label>
                              <Input
                                value={editedAgenceNom}
                                onChange={(e) => {
                                  setEditedAgenceNom(e.target.value);
                                  setValue('agenceNom', e.target.value);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Adresse</Label>
                              <AddressAutocomplete
                                value={editedAgenceAdresse}
                                onChange={(val) => setEditedAgenceAdresse(val)}
                                onSelect={(val) => {
                                  setEditedAgenceAdresse(val);
                                  setValue('adresseLivraison', val, { shouldValidate: true });
                                }}
                                placeholder="Rechercher l'adresse..."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Remettre les valeurs d'origine dans le formulaire
                                if (originalAgence) {
                                  setEditedAgenceNom(originalAgence.nom);
                                  setEditedAgenceAdresse(originalAgence.adresse);
                                  setValue('agenceNom', originalAgence.nom);
                                  setValue('adresseLivraison', originalAgence.adresse, { shouldValidate: true });
                                }
                                setEditingAgence(false);
                              }}
                              className="text-xs text-secondary hover:text-destructive transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Amélioration 1 — Nouvelle agence inline */}
                {watch('entrepriseNom') && (
                  <div className="mt-3">
                    {!showNewAgence ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewAgence(true);
                          setValue('agenceNom', '');
                          setValue('adresseLivraison', '');
                        }}
                        className="text-sm text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
                      >
                        + Mon agence n'est pas listée
                      </button>
                    ) : (
                      <div className="mt-3 p-4 border border-primary/20 rounded-lg bg-surface-container-highest animate-fade-in space-y-3">
                        <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block">
                          Nouvelle agence
                        </Label>
                        <div className="space-y-1">
                          <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                            Nom de l'agence <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="Ex: Agence Nord Isère"
                            value={newAgenceNom}
                            onChange={(e) => {
                              setNewAgenceNom(e.target.value);
                              setValue('agenceNom', e.target.value);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                            Adresse de l'agence
                          </Label>
                          <AddressAutocomplete
                            value={newAgenceAdresse}
                            onChange={(val) => setNewAgenceAdresse(val)}
                            onSelect={(val) => {
                              setNewAgenceAdresse(val);
                              setValue('adresseLivraison', val, { shouldValidate: true });
                            }}
                            placeholder="Rechercher l'adresse..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewAgence(false);
                            setNewAgenceNom('');
                            setNewAgenceAdresse('');
                            setValue('agenceNom', '');
                            setValue('adresseLivraison', '');
                          }}
                          className="text-xs text-secondary hover:text-destructive transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sélecteur de contact */}
                {watch('entrepriseNom') && (
                  <div className="mt-6 pt-6 border-t border-primary/10 animate-fade-in">
                    <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block mb-3">
                      {companyContacts.length > 0 ? 'Sélectionnez le contact' : 'Contacts enregistrés'}
                    </Label>

                    {companyContacts.length === 0 && (
                      <p className="text-xs text-secondary mb-3 italic">Aucun contact spécifique trouvé pour cette entreprise.</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {companyContacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          className={cn(
                            "p-4 rounded-sm border-2 cursor-pointer transition-colors text-sm bg-surface-container-highest",
                            selectedContactId === contact.id ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"
                          )}
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            // Si le contact a prenom/nom séparés (format Desktop), les utiliser directement.
                            // Sinon, fallback : splitter le champ nom (ancien format fusionné).
                            if (contact.prenom) {
                              setValue('prenom', contact.prenom, { shouldValidate: true });
                              setValue('nom', contact.nom || '', { shouldValidate: true });
                            } else {
                              const parts = (contact.nom || '').trim().split(' ');
                              setValue('prenom', parts.length > 1 ? parts[0] : '');
                              setValue('nom', parts.length > 1 ? parts.slice(1).join(' ') : contact.nom, { shouldValidate: true });
                            }
                            setValue('email', contact.email || '', { shouldValidate: true });
                            setValue('telephone', contact.telephone || '', { shouldValidate: true });
                          }}
                        >
                          <div className="font-bold text-on-surface">
                            {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
                          </div>
                          <div className="text-xs text-secondary mt-1">{contact.fonction || 'Contact'}</div>
                        </div>
                      ))}
                      <div
                        className={cn(
                          "p-4 rounded-sm border-2 cursor-pointer transition-colors text-sm flex items-center justify-center font-bold text-secondary bg-surface-container-highest",
                          selectedContactId === 'nouveau' ? "border-primary bg-primary/5 text-primary" : "border-dashed border-secondary/40 hover:border-primary/40"
                        )}
                        onClick={() => {
                          setSelectedContactId('nouveau');
                          setValue('prenom', '');
                          setValue('nom', '');
                          setValue('email', '');
                          setValue('telephone', '');
                        }}
                      >
                        + Nouveau contact
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Champs de saisie (Client data) */}
          {typeClient === 'professionnel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-1 md:col-span-1">
                <Label htmlFor="entrepriseNom" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Nom de l'entreprise <span className="text-destructive">*</span></Label>
                <Input id="entrepriseNom" placeholder="Ex: TP Isère" {...register('entrepriseNom')} />
                {errors.entrepriseNom && <p className="text-xs text-destructive mt-1">{errors.entrepriseNom.message}</p>}
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Adresse du siège <span className="text-destructive">*</span></Label>
                <AddressAutocomplete
                  value={entrepriseAdresse}
                  onChange={(val) => setValue('entrepriseAdresse', val)}
                  onSelect={(val) => setValue('entrepriseAdresse', val, { shouldValidate: true })}
                  placeholder="Rechercher l'adresse..."
                />
                {errors.entrepriseAdresse && <p className="text-xs text-destructive mt-1">{errors.entrepriseAdresse.message}</p>}
              </div>
            </div>
          )}

          <div className="mt-10 mb-4 px-1 py-1 border-b border-primary/10">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Contact Référent
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label htmlFor="nom" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Nom <span className="text-destructive">*</span></Label>
              <Input id="nom" placeholder="Ex: Dupont" {...register('nom')} />
              {errors.nom && <p className="text-xs text-destructive mt-1">{errors.nom.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="prenom" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Prénom <span className="text-destructive">*</span></Label>
              <Input id="prenom" placeholder="Ex: Jean" {...register('prenom')} />
              {errors.prenom && <p className="text-xs text-destructive mt-1">{errors.prenom.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                Email <span className="text-destructive">*</span> <span className="text-[10px] text-primary/60 normal-case ml-1">(récepteur du devis)</span>
              </Label>
              <Input id="email" type="email" placeholder="jean.dupont@email.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="telephone" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Téléphone <span className="text-destructive">*</span></Label>
              <Input
                id="telephone"
                type="tel"
                inputMode="tel"
                placeholder="06 00 00 00 00"
                {...register('telephone')}
              />
              {errors.telephone && <p className="text-xs text-destructive mt-1">{errors.telephone.message}</p>}
            </div>

            {/* Fonction — visible uniquement pour un nouveau contact sur un client existant */}
            {dejaClient === 'oui' && selectedContactId === 'nouveau' && (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="fonction" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Fonction <span className="text-xs normal-case font-normal text-secondary/60">(optionnel)</span></Label>
                <Input id="fonction" placeholder="Ex: Conducteur de travaux" {...register('fonction')} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SectionClient.displayName = 'SectionClient';
export default SectionClient;
