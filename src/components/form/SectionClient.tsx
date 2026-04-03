import { useState } from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { DevisFormData } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import AddressAutocomplete from '../ui/AddressAutocomplete';
import CompanyAutocomplete from '../ui/CompanyAutocomplete';

interface Props {
  register: UseFormRegister<DevisFormData>;
  errors: FieldErrors<DevisFormData>;
  watch: UseFormWatch<DevisFormData>;
  setValue: UseFormSetValue<DevisFormData>;
}

export default function SectionClient({ register, errors, watch, setValue }: Props) {
  const typeClient = watch('typeClient');
  const dejaClient = watch('dejaClient');
  const entrepriseAdresse = watch('entrepriseAdresse') || '';

  const [companyContacts, setCompanyContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

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
          <RadioGroup 
            value={dejaClient} 
            onValueChange={(val: 'oui' | 'non') => setValue('dejaClient', val)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id="compte-oui" className="border-primary text-primary" />
              <Label htmlFor="compte-oui" className="font-medium cursor-pointer text-sm font-body">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id="compte-non" className="border-primary text-primary" />
              <Label htmlFor="compte-non" className="font-medium cursor-pointer text-sm font-body">Non</Label>
            </div>
          </RadioGroup>
          
          {dejaClient === 'oui' && (
            <div className="mt-4 p-6 bg-surface-container rounded-lg animate-fade-in">
              <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-primary block mb-1">
                {typeClient === 'professionnel' ? 'Recherchez votre entreprise' : 'Recherchez votre compte client'}
              </Label>
              <CompanyAutocomplete
                value={watch('entrepriseNom') || ''}
                onChange={(val) => setValue('entrepriseNom', val)}
                onSelect={(company) => {
                  setValue('entrepriseNom', company.nom || '', { shouldValidate: true });
                  if (company.adresse) setValue('entrepriseAdresse', company.adresse, { shouldValidate: true });
                  
                  if (company.contacts && Array.isArray(company.contacts) && company.contacts.length > 0) {
                    setCompanyContacts(company.contacts);
                    setSelectedContactId(null);
                  } else {
                    setCompanyContacts([]);
                    setSelectedContactId('nouveau');
                  }
                  
                  setValue('nom', '');
                  setValue('prenom', '');
                  setValue('email', '');
                  setValue('telephone', '');
                }}
                placeholder={typeClient === 'professionnel' ? "Commencez à taper le nom..." : "Tapez votre nom..."}
                className="mt-2"
              />
              
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
                          const parts = (contact.nom || '').trim().split(' ');
                          const prenom = parts[0] || '';
                          const nom = parts.slice(1).join(' ') || prenom;
                          setValue('prenom', parts.length > 1 ? prenom : '');
                          setValue('nom', parts.length > 1 ? nom : contact.nom, { shouldValidate: true });
                          setValue('email', contact.email || '', { shouldValidate: true });
                          setValue('telephone', contact.telephone || '', { shouldValidate: true });
                        }}
                      >
                        <div className="font-bold text-on-surface">{contact.nom}</div>
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
        </div>
      </div>
    </div>
  );
}
