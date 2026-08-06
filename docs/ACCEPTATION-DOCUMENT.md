# Acceptation d'un devis par document

Le portail ne signe rien électroniquement. Le client formalise son accord en
transmettant **le devis signé et daté** ou **son bon de commande**. Le dépôt
vaut réception ; seule la validation par un opérateur fait passer le devis à
l'état accepté.

## Parcours

```
devis envoyé
   ├── le client dépose un justificatif   -> acceptation_status = document_recu
   │       le devis reste à l'état « envoye »
   │       ├── opérateur valide           -> etat = accepte
   │       ├── opérateur régularise       -> le client redépose
   │       └── opérateur rejette          -> le client redépose
   ├── le client refuse                   -> etat = refuse
   └── le client demande une modification -> nouvelle version
```

## Les trois invariants

1. **Un document est rattaché à une version précise.** Le numéro de version et
   l'empreinte SHA-256 du PDF présenté sont recopiés dans le document. Il n'est
   jamais réaffecté à une autre version.
2. **Une retouche visible d'un devis en négociation crée une nouvelle version**
   et rend caducs les documents déposés sur la précédente.
3. **Passé la planification, une retouche est une régularisation.** Ajuster le
   montant au tonnage réellement livré ne crée pas de version et ne réclame
   aucun nouveau document : le portail affiche « montant accepté » et « montant
   facturé » côte à côte.

## Verrous

| Risque | Verrou |
|---|---|
| Le devis change entre la lecture et le dépôt | Version **et** empreinte revérifiées sous `SELECT … FOR UPDATE` dans `enregistrer_document_acceptation` → `409 QUOTE_VERSION_CHANGED` |
| Double clic, deux onglets | Index unique `(devis_id, devis_version, sha256)` ; l'API répond succès, pas erreur |
| Deux documents actifs | Index unique partiel sur `devis_id` pour les statuts vivants |
| Fichier déposé, base en échec | Suppression compensatoire du fichier Drive, aucun message de succès |
| Identifiant Drive fourni par le navigateur | Jamais accepté : `acceptance-document-pdf` part d'un identifiant Supabase |
| Devis repart en chiffrage pendant un contrôle | `decide_quote` refuse `modification_demandee` → `409` |

## Formats acceptés

PDF, ou une à plusieurs photos. Les photos sont converties en un PDF multipage
**dans le navigateur** ([`src/lib/imagesToPdf.ts`](../src/lib/imagesToPdf.ts))
avant l'envoi : le serveur ne reçoit donc que du PDF et vérifie les octets
`%PDF-`, pas seulement l'extension ni le type déclaré.

La conversion n'utilise aucune bibliothèque : un JPEG s'embarque tel quel via le
filtre `DCTDecode`. Chaque image passe par un canvas (fond blanc, côté maximal
2200 px, qualité 0,85), ce qui uniformise au passage le HEIC de l'iPhone.

## Secrets à poser

```bash
supabase secrets set GOOGLE_DRIVE_SIGNED_QUOTES_FOLDER_ID="1F4mZsMnD15GxajuBOmR9d31tJcoGVOeC"
supabase secrets set GOOGLE_DRIVE_PURCHASE_ORDERS_FOLDER_ID="1m_qiGH3qOUE9NKF0--1kmJMm8pUdHD--"
# facultatif, 15 Mo par défaut
supabase secrets set ACCEPTANCE_MAX_BYTES="15728640"
```

⚠️ **Portée `drive.file`.** Le compte de service ne voit que les fichiers qu'il
a lui-même créés. Deux sous-dossiers créés à la main dans l'interface Drive lui
restent invisibles, **même s'il est membre du Drive partagé** : l'upload échoue
alors en 404. Il faut les lui partager explicitement, ou le laisser les créer.
`uploadNewFile` renvoie un message qui nomme cette cause — il n'y a pas de repli
silencieux sur le dossier principal.

## Déploiement

```bash
supabase functions deploy acceptance-document-upload --no-verify-jwt
supabase functions deploy acceptance-document-pdf   --no-verify-jwt
supabase functions deploy client-actions            --no-verify-jwt
supabase functions deploy client-portal             --no-verify-jwt
supabase functions deploy devis-pdf                 --no-verify-jwt
supabase functions deploy devis-pdf-upload          --no-verify-jwt
```

`--no-verify-jwt` est obligatoire : l'authentification est un JWT client signé
maison, pas un jeton Supabase Auth. Sans ce drapeau, tout répond 401.

## Contrat attendu côté logiciel interne

La file de contrôle s'intègre au fil de discussion existant
(`MessagerieClients.tsx`), pas dans un écran séparé. Le logiciel lit
`documents_acceptation` avec son jeton opérateur et n'écrit que le statut.

| Action | Effet |
|---|---|
| **Valider** | `documents_acceptation.statut = 'valide'`, `devis.etat = 'accepte'`, `acceptation_status = 'valide'`, `acceptation_validated_at/by` |
| **Régulariser** | `statut = 'regularisation_demandee'`, devis inchangé, commentaire **obligatoire** |
| **Rejeter** | `statut = 'rejete'`, devis inchangé, commentaire **obligatoire** |

Avant de renvoyer un devis qui porte un document `a_verifier`, le logiciel doit
afficher une confirmation explicite : publier une nouvelle version rendra ce
document caduc et obligera le client à en fournir un autre.

Ouverture du PDF côté opérateur :

```
GET /functions/v1/acceptance-document-pdf?documentId=<uuid>
Authorization: Bearer <jeton opérateur>
```

## Ce qui n'est pas tracé

`evenements_dossier` ne journalise que ce qui porte une décision. Les
consultations de devis et les téléchargements de PDF n'y figurent pas : volume
important, valeur probante nulle, et une finalité de plus à justifier au titre
du RGPD.
