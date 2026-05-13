import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { DevisFormData, TypeDemande } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AddressAutocomplete from '../ui/AddressAutocomplete';
import { cn } from '@/lib/utils';
import { Truck, Package, ArrowDownToLine, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  register: UseFormRegister<DevisFormData>;
  errors: FieldErrors<DevisFormData>;
  watch: UseFormWatch<DevisFormData>;
  setValue: UseFormSetValue<DevisFormData>;
  onTypeSelect?: () => void;
}

const TYPE_DEMANDE_OPTIONS: { val: TypeDemande; Icon: LucideIcon; title: string; desc: string }[] = [
  {
    val: 'livraison',
    Icon: Truck,
    title: 'Livraison sur chantier',
    desc: 'On vous livre directement — vous n\'avez rien à gérer',
  },
  {
    val: 'fourniture',
    Icon: Package,
    title: 'Enlèvement carrière',
    desc: 'Vous récupérez vous-même à Villard-Bonnot',
  },
  {
    val: 'decharge',
    Icon: ArrowDownToLine,
    title: 'Dépôt de déblais',
    desc: 'Vous apportez vos matériaux à évacuer à notre carrière',
  },
];

const LIVRAISON_DECHARGE_OPTION = {
  val: 'livraison_decharge' as TypeDemande,
  title: 'Livraison + Décharge',
  desc: 'On vous livre ET on repart avec vos déblais — aller-retour optimisé',
};

export default function SectionDemande({ register, errors, watch, setValue, onTypeSelect }: Props) {
  const typeDemande = watch('typeDemande');
  const creneau = watch('creneau');
  const adresseLivraison = watch('adresseLivraison') || '';
  const entrepriseAdresse = watch('entrepriseAdresse') || '';
  const isParticulier = watch('typeClient') === 'particulier';

  const showCreneauSection = (typeDemande === 'livraison' || typeDemande === 'decharge' || typeDemande === 'livraison_decharge') && watch('dateSouhaitee');

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">02</span>
        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">Votre demande</h2>
      </div>

      <div className="space-y-6">
        {/* Type de demande — cartes visuelles */}
        <div>
          <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-3">Type de demande</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TYPE_DEMANDE_OPTIONS.map(({ val, Icon, title, desc }) => (
              <button
                key={val}
                type="button"
                onClick={() => { setValue('typeDemande', val, { shouldValidate: true }); setValue('enginChantier', ''); onTypeSelect?.(); }}
                className={cn(
                  "p-5 rounded-xl border-2 text-left transition-all",
                  typeDemande === val
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-surface-container-highest hover:border-primary/30"
                )}
              >
                <div className={cn("mb-3 w-8 h-8 flex items-center justify-center rounded-md", typeDemande === val ? "bg-primary text-white" : "bg-surface-container text-secondary")}>
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className={cn("font-bold text-sm mb-1", typeDemande === val ? "text-primary" : "text-on-surface")}>{title}</div>
                <div className="text-xs text-secondary leading-relaxed">{desc}</div>
              </button>
            ))}

            {/* Carte Livraison + Décharge — icône double */}
            <button
              type="button"
              onClick={() => { setValue('typeDemande', LIVRAISON_DECHARGE_OPTION.val, { shouldValidate: true }); onTypeSelect?.(); }}
              className={cn(
                "p-5 rounded-xl border-2 text-left transition-all sm:col-span-2",
                typeDemande === 'livraison_decharge'
                  ? "border-purple-500 bg-gradient-to-r from-primary/5 to-purple-500/5 shadow-sm"
                  : "border-border bg-surface-container-highest hover:border-purple-400/40"
              )}
            >
              <div className={cn(
                "mb-3 w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br",
                typeDemande === 'livraison_decharge'
                  ? "from-primary/20 to-purple-500/20"
                  : "from-primary/10 to-purple-500/10"
              )}>
                <div className="flex items-center -space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  <Trash2 className="w-3.5 h-3.5 text-purple-500" strokeWidth={2.5} />
                </div>
              </div>
              <div className={cn("font-bold text-sm mb-1", typeDemande === 'livraison_decharge' ? "text-purple-600" : "text-on-surface")}>
                {LIVRAISON_DECHARGE_OPTION.title}
              </div>
              <div className="text-xs text-secondary leading-relaxed">{LIVRAISON_DECHARGE_OPTION.desc}</div>
            </button>
          </div>
        </div>

        {/* Bannière info + engin — livraison_decharge */}
        {typeDemande === 'livraison_decharge' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-purple-200">
              <span className="text-lg shrink-0">🔄</span>
              <div>
                <p className="text-sm font-medium text-on-surface">Aller-retour optimisé :</p>
                <p className="text-sm text-secondary mt-0.5">Notre camion vous livre vos matériaux sur chantier, puis repart chargé de vos déblais vers notre carrière — <span className="font-medium text-on-surface">le chargement du camion est réalisé par vos soins</span>, avec votre engin de chantier.</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="enginChantier" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                Quel engin avez-vous prévu pour recharger le camion sur votre chantier ? <span className="text-destructive">*</span>
              </Label>
              <Input
                id="enginChantier"
                placeholder="Pelle 1t5, Chargeuse 3000L, ..."
                {...register('enginChantier')}
              />
              {errors.enginChantier && (
                <p className="text-xs text-destructive mt-1">{errors.enginChantier.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Bannière info — fourniture */}
        {typeDemande === 'fourniture' && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-highest border border-border animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-primary text-lg shrink-0">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-on-surface">
                  Vous récupérez les matériaux directement à notre carrière :
                </p>
                <p className="text-sm text-secondary mt-0.5">489 Rue de l'Isle, 38190 Villard-Bonnot</p>
              </div>
            </div>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3332.7396267289387!2d5.860429276596819!3d45.23569334865559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478a593af8abec27%3A0x742bbff2ccb2041a!2s489%20Rue%20de%20l&#39;Isle%2C%2038190%20Villard-Bonnot!5e1!3m2!1sfr!2sfr!4v1778479794674!5m2!1sfr!2sfr"
              width="100%"
              height="260"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
          </div>
        )}

        {/* Bannière info — décharge */}
        {typeDemande === 'decharge' && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-highest border border-border animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">🏗️</span>
              <div>
                <p className="text-sm font-medium text-on-surface">
                  Vous déposez vos matériaux directement à notre carrière :
                </p>
                <p className="text-sm text-secondary mt-0.5">489 Rue de l'Isle, 38190 Villard-Bonnot</p>
              </div>
            </div>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3332.7396267289387!2d5.860429276596819!3d45.23569334865559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478a593af8abec27%3A0x742bbff2ccb2041a!2s489%20Rue%20de%20l&#39;Isle%2C%2038190%20Villard-Bonnot!5e1!3m2!1sfr!2sfr!4v1778479794674!5m2!1sfr!2sfr"
              width="100%"
              height="260"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
          </div>
        )}

        {/* Champs livraison — adresse + date + créneau */}
        {typeDemande === 'livraison' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="adresseLivraison" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center">
                <div>{isParticulier ? 'Adresse de livraison' : 'Adresse de livraison (chantier)'} <span className="text-destructive">*</span></div>
                {entrepriseAdresse && (
                  <label className="flex items-center gap-1.5 cursor-pointer normal-case text-xs font-medium text-secondary hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      className="accent-primary w-3.5 h-3.5"
                      checked={adresseLivraison === entrepriseAdresse}
                      onChange={(e) => {
                        setValue('adresseLivraison', e.target.checked ? entrepriseAdresse : '', { shouldValidate: true });
                      }}
                    />
                    Même adresse que le siège
                  </label>
                )}
              </Label>
              <AddressAutocomplete
                value={adresseLivraison}
                onChange={(val) => setValue('adresseLivraison', val)}
                onSelect={(val) => setValue('adresseLivraison', val, { shouldValidate: true })}
                placeholder={isParticulier ? "Rechercher votre adresse de livraison..." : "Rechercher l'adresse du chantier..."}
              />
              {errors.adresseLivraison && <p className="text-xs text-destructive mt-1">{errors.adresseLivraison.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateSouhaitee" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full">
                <span>Date souhaitée</span>
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel · lun–ven)</span>
              </Label>
              <Input id="dateSouhaitee" type="date" {...register('dateSouhaitee', {
                onChange: (e) => {
                  const val = e.target.value;
                  if (val) {
                    const day = new Date(val + 'T00:00:00').getDay();
                    if (day === 0 || day === 6) setValue('dateSouhaitee', '');
                  }
                }
              })} />
            </div>

            {showCreneauSection && (
              <div className="space-y-1 animate-fade-in">
                <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full mb-3">
                  <span>Créneau préféré</span>
                  <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
                </Label>
                <RadioGroup
                  value={creneau ?? 'indifferent'}
                  onValueChange={(val: 'matin' | 'apres_midi' | 'indifferent') => setValue('creneau', val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="matin" id="matin" className="border-primary text-primary" />
                    <Label htmlFor="matin" className="font-normal cursor-pointer text-sm font-body">Matin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="apres_midi" id="apres_midi" className="border-primary text-primary" />
                    <Label htmlFor="apres_midi" className="font-normal cursor-pointer text-sm font-body">Après-midi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indifferent" id="indifferent" className="border-primary text-primary" />
                    <Label htmlFor="indifferent" className="font-normal cursor-pointer text-sm font-body">Indifférent</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        {/* Champs livraison_decharge — adresse chantier + date + créneau */}
        {typeDemande === 'livraison_decharge' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="adresseLivraisonCombi" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center">
                <div>{isParticulier ? 'Adresse de livraison' : 'Adresse du chantier'} <span className="text-destructive">*</span></div>
                {entrepriseAdresse && (
                  <label className="flex items-center gap-1.5 cursor-pointer normal-case text-xs font-medium text-secondary hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      className="accent-primary w-3.5 h-3.5"
                      checked={adresseLivraison === entrepriseAdresse}
                      onChange={(e) => {
                        setValue('adresseLivraison', e.target.checked ? entrepriseAdresse : '', { shouldValidate: true });
                      }}
                    />
                    Même adresse que le siège
                  </label>
                )}
              </Label>
              <AddressAutocomplete
                value={adresseLivraison}
                onChange={(val) => setValue('adresseLivraison', val)}
                onSelect={(val) => setValue('adresseLivraison', val, { shouldValidate: true })}
                placeholder={isParticulier ? "Rechercher votre adresse de livraison..." : "Rechercher l'adresse du chantier..."}
              />
              {errors.adresseLivraison && <p className="text-xs text-destructive mt-1">{errors.adresseLivraison.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateSouhaiteeCombi" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full">
                <span>Date souhaitée</span>
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel · lun–ven)</span>
              </Label>
              <Input id="dateSouhaiteeCombi" type="date" {...register('dateSouhaitee', {
                onChange: (e) => {
                  const val = e.target.value;
                  if (val) {
                    const day = new Date(val + 'T00:00:00').getDay();
                    if (day === 0 || day === 6) setValue('dateSouhaitee', '');
                  }
                }
              })} />
            </div>

            {showCreneauSection && (
              <div className="space-y-1 animate-fade-in">
                <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full mb-3">
                  <span>Créneau préféré</span>
                  <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
                </Label>
                <RadioGroup
                  value={creneau ?? 'indifferent'}
                  onValueChange={(val: 'matin' | 'apres_midi' | 'indifferent') => setValue('creneau', val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="matin" id="matin-c" className="border-primary text-primary" />
                    <Label htmlFor="matin-c" className="font-normal cursor-pointer text-sm font-body">Matin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="apres_midi" id="apres_midi-c" className="border-primary text-primary" />
                    <Label htmlFor="apres_midi-c" className="font-normal cursor-pointer text-sm font-body">Après-midi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indifferent" id="indifferent-c" className="border-primary text-primary" />
                    <Label htmlFor="indifferent-c" className="font-normal cursor-pointer text-sm font-body">Indifférent</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        {/* Champs décharge — date + créneau uniquement (pas d'adresse) */}
        {typeDemande === 'decharge' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
            <div className="space-y-1">
              <Label htmlFor="dateSouhaitee" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full">
                <span>Date souhaitée</span>
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel · lun–ven)</span>
              </Label>
              <Input id="dateSouhaitee" type="date" {...register('dateSouhaitee', {
                onChange: (e) => {
                  const val = e.target.value;
                  if (val) {
                    const day = new Date(val + 'T00:00:00').getDay();
                    if (day === 0 || day === 6) setValue('dateSouhaitee', '');
                  }
                }
              })} />
            </div>

            {showCreneauSection && (
              <div className="space-y-1 animate-fade-in">
                <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full mb-3">
                  <span>Créneau préféré</span>
                  <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
                </Label>
                <RadioGroup
                  value={creneau ?? 'indifferent'}
                  onValueChange={(val: 'matin' | 'apres_midi' | 'indifferent') => setValue('creneau', val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="matin" id="matin-d" className="border-primary text-primary" />
                    <Label htmlFor="matin-d" className="font-normal cursor-pointer text-sm font-body">Matin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="apres_midi" id="apres_midi-d" className="border-primary text-primary" />
                    <Label htmlFor="apres_midi-d" className="font-normal cursor-pointer text-sm font-body">Après-midi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indifferent" id="indifferent-d" className="border-primary text-primary" />
                    <Label htmlFor="indifferent-d" className="font-normal cursor-pointer text-sm font-body">Indifférent</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
