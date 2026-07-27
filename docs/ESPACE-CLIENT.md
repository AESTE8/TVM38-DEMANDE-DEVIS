# Espace client — mise en service

Cette fonctionnalité donne à chaque client TVM38 un espace personnel où il
retrouve les demandes qu'il a envoyées depuis le site et les devis que la
carrière lui a transmis en réponse.

---

## 1. Le principe : une seule source de vérité

Le site **ne stocke aucune copie** des devis. L'espace client lit la ligne
`devis` en direct — exactement celle qu'édite le logiciel de la carrière.

Conséquence : quand le dispatcher modifie un devis et enregistre, le client voit
le nouveau montant au rechargement de sa page. Il n'y a aucune synchronisation à
maintenir, donc aucune divergence possible.

Reste un cas à traiter honnêtement : le client a reçu un **email** indiquant
1 462,50 € et le site affiche 1 380 €. Pour qu'il n'ait pas à appeler la
carrière, la colonne `montant_envoye` fige le montant au moment de l'envoi. Dès
que `montant_total_ht` s'en écarte, l'espace client affiche un bandeau :

> ⚠️ Ce devis a été mis à jour le 24/07/2026.
> Le montant ci-dessous fait foi — l'email du 23/07 indiquait 1 462,50 € HT.

`montant_envoye` est renseigné par un **trigger PostgreSQL**, pas par le
logiciel : la capture a donc lieu quoi qu'il arrive.

---

## 2. Ce que voit le client

| Écran | Route | Contenu |
|---|---|---|
| Mon espace | `/espace` | Le fil de ses affaires, de la plus récente à la plus ancienne |
| Détail | `/espace/:id` | Suivi, devis, rappel de la demande |

Les demandes et les devis forment **un seul fil**, pas deux listes : le client
pense « mon gravier pour le chantier de Voiron », pas « mes demandes » d'un côté
et « mes devis » de l'autre. Chaque affaire porte un statut qui avance :

```
Demande envoyée → En cours de chiffrage → Devis reçu → Devis accepté → Livraison réalisée
```

**Ce qui n'est jamais exposé** : les devis en `en_attente` (brouillons du
dispatcher), les devis `archive`, ainsi que les notes internes, coûts de péage,
taux de remise, chauffeur affecté et statut de paiement.

Le portail affiche les matériaux, les quantités et le **total HT**. Le détail du
calcul (transport, remises) reste sur le PDF : le reproduire côté web
impliquerait de réimplémenter le moteur de tarification du logiciel, avec le
risque d'afficher au client un chiffre qui ne correspond pas au sien.

---

## 3. Mise en service

### 3.1 Migration de la base

```bash
supabase db push
```

Ou en collant `supabase/migrations/20260726000000_espace_client.sql` dans le SQL
Editor. La migration est **additive** : nouvelle table `demandes`, nouvelles
colonnes nullables sur `devis` et `clients`. Aucune colonne existante n'est
modifiée, le logiciel continue de fonctionner sans changement.

Elle installe aussi un trigger `devis_touch_trg` sur `devis`, qui tient à jour
`updated_at` et capture `montant_envoye` à l'envoi.

Le backfill rattache les 61 devis existants à leur client (rapprochement exact
sur `nom_client`, vérifié sans ambiguïté au préalable).

### 3.2 Secrets des edge functions

```bash
# Signature des jetons client — au moins 32 caractères, généré aléatoirement
supabase secrets set CLIENT_JWT_SECRET="$(openssl rand -base64 48)"

# Compte de service Google (le fichier JSON entier, sur une seule ligne)
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat compte-service.json | tr -d '\n')"

# Dossier de destination des PDF dans le Drive partagé
supabase secrets set GOOGLE_DRIVE_FOLDER_ID="1AbC..."
```

⚠️ **Ne jamais committer ces valeurs.** Le fichier JSON du compte de service ne
doit exister que dans les secrets Supabase — surtout pas dans le logiciel
desktop.

### 3.3 Déploiement des fonctions

```bash
supabase functions deploy auth-client
supabase functions deploy send-email
supabase functions deploy client-portal
supabase functions deploy devis-pdf
supabase functions deploy devis-pdf-upload
```

---

## 4. Google Drive — configuration

### ⚠️ Le point qui bloque si on l'oublie

Les comptes de service Google **n'ont pas de quota de stockage propre**. Déposer
un fichier dans un dossier d'un Drive personnel échoue avec :

```
Service Accounts do not have storage quota.
Leverage shared drives or use OAuth delegation instead.
```

Le dossier cible doit donc être un **Drive partagé** (*Shared Drive*), ce qui
suppose un compte **Google Workspace**. Avec une simple adresse Gmail, cette
architecture ne fonctionne pas — il faudra alors basculer sur Supabase Storage.

### Étapes

1. Google Cloud Console → créer un projet → activer l'**API Google Drive**.
2. Créer un **compte de service**, générer une clé JSON.
3. Dans Google Drive, créer un **Drive partagé** puis un dossier `Devis`.
4. Partager ce Drive avec l'adresse `...@....iam.gserviceaccount.com` du compte
   de service, en rôle **Gestionnaire de contenu**.
5. Récupérer l'ID du dossier depuis son URL
   (`https://drive.google.com/drive/folders/<ID>`) → `GOOGLE_DRIVE_FOLDER_ID`.

La portée demandée est `drive.file` : le compte de service ne voit que les
fichiers qu'il a lui-même créés, jamais le reste du Drive.

### Le PDF n'est jamais public

Les fichiers restent privés. Le client passe par `devis-pdf`, qui vérifie son
jeton, vérifie que le devis lui appartient, puis relaie le contenu. Aucun lien
Drive permanent ne circule, donc rien à révoquer si un client transfère un email.

---

## 5. Modifications à faire dans le logiciel de la carrière

Trois changements, par ordre d'importance.

### 5.1 Renseigner `client_id` sur chaque devis — indispensable

À la création d'un devis, écrire l'`id` du client sélectionné dans la nouvelle
colonne `devis.client_id`.

Sans cela, un devis créé après la migration n'apparaîtra dans aucun espace
client. `nom_client` reste renseigné comme avant, pour l'affichage.

### 5.2 Convertir une demande web en devis — fortement recommandé

Les demandes envoyées depuis le site arrivent dans la table `demandes` avec
`statut = 'envoyee'`. Idéalement, le logiciel affiche cette file d'attente et
permet de créer un devis pré-rempli à partir d'une demande.

Au moment de la création du devis :

```sql
-- Le devis répond à la demande
update devis set demande_id = :demandeId where id = :devisId;

-- La demande n'est plus en attente
update demandes set statut = 'devisee' where id = :demandeId;
```

Statuts disponibles sur `demandes` : `envoyee`, `en_traitement`, `devisee`,
`sans_suite`. Passer une demande à `en_traitement` dès son ouverture fait
apparaître « En cours de chiffrage » chez le client — c'est peu de travail pour
un gain de confiance réel.

Sans ce rattachement, le site fonctionne quand même : la demande et le devis
apparaissent alors comme deux entrées distinctes dans le fil.

### 5.3 Envoyer le PDF à chaque enregistrement

**À chaque enregistrement d'un devis**, pas uniquement au premier envoi. Sinon
le montant affiché dans l'espace client serait à jour alors que le PDF
téléchargeable resterait celui d'avant modification.

```http
POST https://<projet>.supabase.co/functions/v1/devis-pdf-upload
Authorization: Bearer <access_token Supabase de l'opérateur connecté>
Content-Type: application/json

{
  "devisId":   "4063b55b-...",
  "fileName":  "26TVM0064.pdf",
  "pdfBase64": "JVBERi0xLjQK..."
}
```

Réponse : `{ "success": true, "driveFileId": "1x2y..." }`

La fonction **écrase le fichier Drive existant** quand `drive_file_id` est déjà
renseigné. Le lien ne change donc jamais, et le PDF derrière est toujours la
dernière version enregistrée. C'est ce qui fait que le PDF ne peut pas devenir
obsolète.

### 5.4 Cas particulier : renvoi le jour même

Le trigger refige `montant_envoye` quand `date_envoi` change. Si le dispatcher
modifie **puis renvoie le devis le même jour**, `date_envoi` ne change pas et le
bandeau « mis à jour » resterait affiché à tort. Dans ce cas, le logiciel doit
écrire lui-même :

```sql
update devis set montant_envoye = montant_total_ht where id = :devisId;
```

---

## 6. Authentification

L'ancien mécanisme comparait un mot de passe stocké **en clair** et déposait un
objet client librement modifiable dans le `localStorage`. Tant que le site
n'ouvrait qu'un formulaire, l'enjeu restait faible ; il ne l'est plus dès lors
qu'on expose des montants, un historique et des adresses de chantier.

Désormais :

- Les mots de passe sont vérifiés contre un hash **PBKDF2-SHA256**
  (210 000 itérations, sel aléatoire de 16 octets).
- `auth-client` délivre un **JWT HS256** signé. Modifier le `localStorage`
  n'ouvre plus rien : les edge functions ne se fient qu'à la signature, et
  filtrent sur le `sub` du jeton — jamais sur un identifiant fourni par
  l'appelant.
- Durée de validité : 7 jours, comme la session précédente.

**Migration transparente.** Tant qu'un compte n'a pas de `password_hash`, la
fonction compare à l'ancien `password` puis écrit le hash au vol. Aucun des 241
clients n'a de mot de passe à réinitialiser.

Une fois tous les comptes migrés (`select count(*) from clients where
password_hash is null and password is not null;` → 0), la colonne `password`
peut être supprimée :

```sql
alter table public.clients drop column password;
```

Le logiciel desktop doit alors, lui aussi, écrire un hash lorsqu'il crée un
compte ou change un mot de passe.

---

## 7. Durcissement RLS du référentiel — appliqué

Problème détecté en vérifiant les migrations précédentes : la clé publique du
site, distribuée en clair dans le bundle JavaScript, disposait d'un accès **en
écriture** à `materiaux`, `camions` et `chauffeurs` (`for all to anon using
(true) with check (true)`). N'importe qui pouvait modifier les prix au tonnage
servant au chiffrage. `tranches_remise` n'avait carrément pas de RLS.

Corrigé par `20260726010000_durcissement_rls_referentiel.sql`. Vérifié en
endossant le rôle `anon` :

| Vérification | Résultat |
|---|---|
| Le formulaire lit les matériaux | ✅ 29 lignes visibles |
| Le public modifie les prix | 🔒 bloqué |
| Le public lit `tranches_remise` | 🔒 bloqué |
| Le public lit les devis | 🔒 bloqué |
| Le public lit les demandes | 🔒 bloqué |
| Le public lit les clients | 🔒 bloqué |

Les policies `authenticated` sont inchangées : le logiciel conserve ses droits.

## 8. Observation — `CompanyAutocomplete` et le mode invité

`src/components/ui/CompanyAutocomplete.tsx:45` interroge `clients` directement
avec la clé publique. Or `clients` n'a **jamais eu** de policy `anon` : cette
requête renvoie une liste vide depuis toujours, indépendamment des changements
ci-dessus.

L'autocomplétion d'entreprise ne fonctionne donc pas en mode invité. Si le
comportement attendu est qu'elle fonctionne, il faut passer par une edge
function dédiée qui ne renvoie que `id` et `nom` — surtout pas ouvrir `clients`
en lecture anon, la table contient les mots de passe et l'ensemble des contacts.
