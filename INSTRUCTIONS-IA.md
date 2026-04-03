# Instructions pour l'IA — Améliorations TVM38-DEMANDE-DEVIS

## Contexte

Ce site web permet aux clients (particuliers et professionnels) de soumettre une demande de devis en ligne. Il partage la même base de données Supabase que l'application desktop TVM38 utilisée par les opérateurs à la carrière.

Deux améliorations sont à implémenter :
1. **Pré-remplissage complet** à partir de la table `clients` (les noms de colonnes actuels sont incorrects/incomplets)
2. **Création de nouveau contact persistée en base** : quand un client ajoute un contact inexistant, celui-ci doit être sauvegardé dans Supabase pour éviter que l'opérateur doive le ressaisir dans l'application desktop

---

## Structure exacte de la base de données

### TABLE `clients`
C'est la table principale à exploiter.

```
id                  TEXT        — identifiant unique UUID
nom                 TEXT        — nom de l'entreprise ou du particulier
code                TEXT        — code client interne
type                TEXT        — 'professionnel' | 'particulier' | 'professionnel_sans_compte'
adresse             TEXT        — adresse complète en texte libre
adresse_structuree  JSONB       — { numero, rue, codePostal, ville }
telephone           TEXT        — numéro principal
email               TEXT        — email principal
contacts            JSONB       — tableau : [{ id, nom, telephone, email, fonction }]
agences             JSONB       — tableau : [{ id, nom, adresse, adresseStructuree }]
created_at          TIMESTAMPTZ
```

---

## AMÉLIORATION 1 — Corriger le pré-remplissage client

### Fichier : `src/components/ui/CompanyAutocomplete.tsx`

Remplacer la requête Supabase actuelle par la suivante (noms de colonnes exacts) :

```typescript
const { data, error } = await supabase
  .from('clients')
  .select('id, nom, code, type, adresse, adresse_structuree, telephone, email, contacts, agences')
  .ilike('nom', `%${value}%`)
  .limit(5);
```

### Fichier : `src/components/form/SectionClient.tsx`

Quand l'utilisateur sélectionne une entreprise, pré-remplir les champs suivants :

```typescript
// Données de l'entreprise
setValue('entrepriseNom', client.nom);
setValue('entrepriseAdresse', client.adresse);

// Contacts : afficher la liste pour sélection
// Chaque contact dans client.contacts a : { id, nom, telephone, email, fonction }
// Quand un contact est sélectionné → pré-remplir prenom, nom, email, telephone

// Agences : si client.agences contient plusieurs entrées
// → afficher un sélecteur "Choisir un site de livraison"
// → sélection pré-remplit adresseLivraison
```

---

## AMÉLIORATION 2 — Persister le nouveau contact en base

### Fichier : `src/components/form/SectionClient.tsx`

Quand l'utilisateur clique sur "+ Nouveau contact" et saisit ses coordonnées, mettre à jour la table `clients` pour ajouter ce contact dans le tableau JSONB `contacts` :

```typescript
const nouveauContact = {
  id: crypto.randomUUID(),
  nom: `${formData.prenom} ${formData.nom}`,
  telephone: formData.telephone,
  email: formData.email,
  fonction: formData.fonction || '', // champ optionnel à ajouter dans le formulaire
};

// Récupérer les contacts existants et y ajouter le nouveau
const { data: clientData } = await supabase
  .from('clients')
  .select('contacts')
  .eq('id', selectedClientId)
  .single();

const contactsExistants = clientData?.contacts || [];

await supabase
  .from('clients')
  .update({
    contacts: [...contactsExistants, nouveauContact]
  })
  .eq('id', selectedClientId);
```

**Cas particulier :** Si `dejaClient === 'non'`, ne pas créer d'entrée dans `clients`. La création de compte reste à la charge de l'opérateur à la carrière.

---

## Règles de sécurité Supabase (RLS)

La clé utilisée côté web est la **Publishable key** (anciennement anon key). Les politiques RLS doivent autoriser :

- **SELECT** sur `clients` → pour l'autocomplétion de recherche d'entreprise
- **UPDATE** sur `clients` → pour l'ajout de contact dans le JSONB

Si ces politiques n'existent pas encore, les exécuter dans Supabase SQL Editor :

```sql
-- Lecture publique des clients (autocomplétion)
CREATE POLICY "allow_public_read_clients" ON clients
  FOR SELECT USING (true);

-- Mise à jour des contacts (ajout nouveau contact)
CREATE POLICY "allow_public_update_contacts" ON clients
  FOR UPDATE USING (true) WITH CHECK (true);
```

---

## Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/ui/CompanyAutocomplete.tsx` | Corriger les noms de colonnes, ajouter `contacts` + `agences` dans le select |
| `src/components/form/SectionClient.tsx` | Pré-remplir depuis les contacts JSONB, ajouter sélecteur agence, persister nouveau contact |

> La soumission du formulaire reste inchangée (envoi par email via Web3Forms + Resend). Ne pas modifier `FormPage.tsx` côté soumission.
