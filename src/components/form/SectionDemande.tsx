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

export default function SectionDemande({ register, errors, watch, setValue }: Props) {
  const typeDemande = watch('typeDemande');
  const creneau = watch('creneau');
  const adresseLivraison = watch('adresseLivraison') || '';
  const entrepriseAdresse = watch('entrepriseAdresse') || '';

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
                onClick={() => setValue('typeDemande', val, { shouldValidate: true })}
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
              onClick={() => setValue('typeDemande', LIVRAISON_DECHARGE_OPTION.val, { shouldValidate: true })}
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

        {/* Bannière info — livraison_decharge */}
        {typeDemande === 'livraison_decharge' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-purple-200 animate-fade-in">
            <span className="text-lg shrink-0">🔄</span>
            <div>
              <p className="text-sm font-medium text-on-surface">Aller-retour optimisé :</p>
              <p className="text-sm text-secondary mt-0.5">Notre camion vous livre vos matériaux sur chantier, puis repart avec vos déblais vers notre carrière.</p>
            </div>
          </div>
        )}

        {/* Bannière info — fourniture */}
        {typeDemande === 'fourniture' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-highest border border-border animate-fade-in">
            <span className="text-primary text-lg shrink-0">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-on-surface">
                Vous récupérez les matériaux directement à notre carrière :
              </p>
              <p className="text-sm text-secondary mt-0.5">489 Rue de l'Isle, 38190 Villard-Bonnot</p>
            </div>
          </div>
        )}

        {/* Bannière info — décharge */}
        {typeDemande === 'decharge' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-highest border border-border animate-fade-in">
            <span className="text-lg shrink-0">🏗️</span>
            <div>
              <p className="text-sm font-medium text-on-surface">
                Vous déposez vos matériaux directement à notre carrière :
              </p>
              <p className="text-sm text-secondary mt-0.5">489 Rue de l'Isle, 38190 Villard-Bonnot</p>
            </div>
          </div>
        )}

        {/* Champs livraison — adresse + date + créneau */}
        {typeDemande === 'livraison' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="adresseLivraison" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center">
                <div>Adresse de livraison (chantier) <span className="text-destructive">*</span></div>
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
                placeholder="Rechercher l'adresse du chantier..."
              />
              {errors.adresseLivraison && <p className="text-xs text-destructive mt-1">{errors.adresseLivraison.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateSouhaitee" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full">
                <span>Date souhaitée</span>
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
              </Label>
              <Input id="dateSouhaitee" type="date" {...register('dateSouhaitee')} />
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
                <div>Adresse du chantier <span className="text-destructive">*</span></div>
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
                placeholder="Rechercher l'adresse du chantier..."
              />
              {errors.adresseLivraison && <p className="text-xs text-destructive mt-1">{errors.adresseLivraison.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateSouhaiteeCombi" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full">
                <span>Date souhaitée</span>
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
              </Label>
              <Input id="dateSouhaiteeCombi" type="date" {...register('dateSouhaitee')} />
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
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
              </Label>
              <Input id="dateSouhaitee" type="date" {...register('dateSouhaitee')} />
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
