# Instructions pour l'IA — Améliorations TVM38 Formulaire Web (V2)

## Contexte

Ce site web permet aux clients professionnels de soumettre des demandes de devis en ligne.
Il partage la même base Supabase que l'application desktop TVM38 utilisée par les opérateurs à la carrière.

**Principe clé :** L'email Web3Forms reste l'unique notification pour l'opérateur. Le gain de ces améliorations est que quand l'opérateur ouvre l'app desktop après réception de l'email, les nouvelles agences, contacts et infos client sont **déjà dans Supabase** — sans ressaisie.

---

## Structure exacte de la base de données

### TABLE `clients`

```
id                  TEXT        — UUID unique
nom                 TEXT        — Nom entreprise
code                TEXT        — Code client interne (NE PAS modifier depuis le web)
type                TEXT        — 'professionnel' | 'particulier' | 'professionnel_sans_compte'
adresse             TEXT        — Adresse siège en texte libre
adresse_structuree  JSONB       — { numero, rue, codePostal, ville }
telephone           TEXT        — Téléphone principal
email               TEXT        — Email principal
contacts            JSONB       — [{ id, nom, telephone, email, fonction }]
agences             JSONB       — [{ id, nom, adresse }]
created_at          TIMESTAMPTZ
```

---

## AMÉLIORATION 1 — Création d'une nouvelle agence inline

### Où : `src/components/form/SectionClient.tsx`

Après l'affichage de la liste des agences existantes (select dropdown), ajouter un bouton **"+ Mon agence n'est pas listée"**.

**Comportement :**
- Cliquer sur ce bouton affiche 2 champs inline juste en dessous :
  - **Nom de l'agence** (champ texte, obligatoire si le bloc est ouvert)
  - **Adresse de l'agence** (réutiliser `AddressAutocomplete` déjà présent dans le projet)
- La nouvelle agence est automatiquement sélectionnée comme agence de référence pour cette demande

**États à ajouter dans SectionClient :**
```typescript
const [showNewAgence, setShowNewAgence] = useState(false);
const [newAgenceNom, setNewAgenceNom] = useState('');
const [newAgenceAdresse, setNewAgenceAdresse] = useState('');
```

**Exposer via `useImperativeHandle` une nouvelle méthode :**
```typescript
saveNewAgenceIfNeeded: async (formData: DevisFormData) => {
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
}
```

---

## AMÉLIORATION 2 — Mise à jour des infos client depuis le web

### Où : `src/components/form/SectionClient.tsx`

Quand un client existant est sélectionné via `CompanyAutocomplete`, afficher ses infos actuelles avec une icône ✏️ permettant de les modifier.

**Champs modifiables :**
- Téléphone principal
- Email principal
- Adresse siège

**Champs NON modifiables (réservés à l'opérateur desktop) :**
- Nom de l'entreprise
- Code client

**Implémentation :**

1. Au moment où l'entreprise est sélectionnée, sauvegarder un snapshot des valeurs originales :
```typescript
const [originalClient, setOriginalClient] = useState<{
  telephone: string;
  email: string;
  adresse: string;
} | null>(null);

// Dans le handler onSelect de CompanyAutocomplete :
setOriginalClient({
  telephone: company.telephone || '',
  email: company.email || '',
  adresse: company.adresse || '',
});
```

2. Afficher les champs en mode lecture avec icône ✏️ :
- Au clic sur ✏️ → le champ passe en mode édition inline
- Les champs pré-remplis depuis Supabase sont éditables

3. Exposer via `useImperativeHandle` une méthode :
```typescript
updateClientInfoIfChanged: async (formData: DevisFormData) => {
  if (!selectedClientId || !originalClient) return;

  const telephone = formData.telephone || '';
  const email = formData.email || '';
  const adresse = formData.entrepriseAdresse || '';

  const hasChanged =
    telephone !== originalClient.telephone ||
    email !== originalClient.email ||
    adresse !== originalClient.adresse;

  if (!hasChanged) return; // Rien à faire

  await supabase
    .from('clients')
    .update({ telephone, email, adresse })
    .eq('id', selectedClientId);
}
```

---

## AMÉLIORATION 3 — Orchestration dans FormPage.tsx

### Où : `src/pages/FormPage.tsx`

Modifier la fonction `onSubmit` pour appeler les 3 méthodes Supabase **avant** l'appel Web3Forms, dans cet ordre séquentiel :

```typescript
const onSubmit = async (data: DevisFormData) => {
  setIsSubmitting(true);
  try {
    // 1. Sauvegarder nouveau contact si besoin (déjà existant)
    await sectionClientRef.current?.saveNewContactIfNeeded(data);

    // 2. Sauvegarder nouvelle agence si besoin (nouveau)
    await sectionClientRef.current?.saveNewAgenceIfNeeded(data);

    // 3. Mettre à jour les infos client si modifiées (nouveau)
    await sectionClientRef.current?.updateClientInfoIfChanged(data);

  } catch (err) {
    // Erreur Supabase silencieuse — on continue quand même
    // L'email Web3Forms est le filet de sécurité
    console.warn('Supabase sync partielle :', err);
  }

  // Toujours exécuté, même si Supabase a échoué
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      // ... payload existant inchangé
    });
    // ... gestion succès/erreur existante inchangée
  } catch (err) {
    // ... gestion erreur existante inchangée
  } finally {
    setIsSubmitting(false);
  }
};
```

**Principe important :** Les erreurs Supabase ne doivent **jamais** bloquer l'envoi de la demande ni afficher un message d'erreur à l'utilisateur. L'email reste le filet de sécurité.

---

## AMÉLIORATION 4 — Politiques RLS Supabase

Exécuter ces SQL dans le **Supabase SQL Editor** si ce n'est pas déjà fait :

```sql
-- Lecture publique des clients (autocomplétion)
CREATE POLICY "allow_public_read_clients" ON clients
  FOR SELECT USING (true);

-- Mise à jour publique (contacts, agences, infos)
CREATE POLICY "allow_public_update_clients" ON clients
  FOR UPDATE USING (true) WITH CHECK (true);
```

---

## Résumé des fichiers à modifier

| Fichier | Modifications |
|---|---|
| `src/components/form/SectionClient.tsx` | Bouton "+ Mon agence n'est pas listée" + champs inline, icônes ✏️ sur infos client, snapshot originalClient, nouvelles méthodes imperativeHandle |
| `src/pages/FormPage.tsx` | Appels séquentiels `saveNewAgenceIfNeeded` et `updateClientInfoIfChanged` avant Web3Forms |

## Fichiers à ne PAS modifier

| Fichier | Raison |
|---|---|
| `src/components/ui/CompanyAutocomplete.tsx` | Fonctionne déjà correctement |
| `src/components/ui/AddressAutocomplete.tsx` | À réutiliser tel quel pour l'adresse d'agence |
| `src/pages/FormPage.tsx` (payload Web3Forms) | Le contenu de l'email reste inchangé |
| `src/data/materiaux.ts` | Catalogue statique, ne pas toucher |

---

## Cas limites à gérer

| Situation | Comportement attendu |
|---|---|
| Supabase hors ligne | Erreur silencieuse, email envoyé quand même |
| Nom agence rempli mais adresse vide | Agence sauvée avec adresse vide — acceptable |
| Client ne modifie rien | Aucun appel UPDATE déclenché (comparaison snapshot) |
| `selectedClientId` absent | Aucune écriture Supabase, on passe directement à Web3Forms |
| Client particulier ou `dejaClient === 'non'` | Aucune écriture Supabase sur `clients` |
