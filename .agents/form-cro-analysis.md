# Analyse Form-CRO — Formulaire Devis TVM38

*Date: 2026-04-26*
*Type de formulaire: Demande de devis multi-étape*

---

## Vue d'ensemble

**Type de formulaire:** Quote/Estimate Request (multi-étape)
**Nombre de champs totaux:** 15-20 (selon réponses)
**État actuel:** Formulaire divisé en 4 étapes avec barre de progression

---

## Analyse étape par étape

### Étape 1 — Coordonnées

**Champs actuels:**
- Type client (Pro/Particulier) — radio
- Nom entreprise — text (pro uniquement)
- Adresse entreprise — text (pro uniquement)
- Fonction — text (pro uniquement)
- Nom — text
- Prénom — text
- Téléphone — text avec validation française
- Email — email

**Analyse:**
- ✅ Séparation Pro/Particulier logique
- ✅ Champs obligatoires bien identifiés
- ✅ Validation téléphone française
- ✅ Autocomplétion entreprise disponible
- ⚠️ Nom + Prénom séparés pourrait être fusionnés (single field réduit friction)

**Recommandations:**
1. Tester "Nom complet" (single field) vs. Nom + Prénom (split)
2. Rendre "Fonction" optionnel (pas toutes les entreprises ont des fonctions clairement définies)
3. Ajouter indicateur de progression par étape: "Étape 1/4 — Coordonnées"

### Étape 2 — Projet

**Champs actuels:**
- Type demande — radio (livraison, fourniture, décharge, livraison+décharge)
- Adresse livraison — text avec autocomplétion
- Date souvenue — date picker
- Créneau — radio (matin, après-midi, indifférent)

**Analyse:**
- ✅ Options type demande claires
- ✅ Autocomplétion adresse
- ✅ Créneaux logiques
- ⚠️ Date souvenue pourrait être plus ergonomique

**Recommandations:**
1. Transformer le date picker en sélecteur de "Au plus tôt" / "Cette semaine" / "Date précise"
2. Ajouter exemple d'adresse dans le placeholder
3. Ajouter petit pictogramme (icône camion vs. grue vs. sac) pour chaque option type demande

### Étape 3 — Matériaux

**Champs actuels:**
- Sélection matériaux (liste avec sections)
- Quantité (tonnes/m³)
- Type (livraison/décharge) — si livraison+décharge
- Onglets (Livraison | Décharge) — si livraison+décharge

**Analyse:**
- ✅ Sidebar avec capacités camions très utile
- ✅ Sections matériaux bien organisées
- ✅ Conversion tonnes/m³ en temps réel
- ⚠️ Pas d'aide à l'estimation rapide

**Recommandations:**
1. Ajouter un calculateur rapide en bas de la sidebar (intégré dans l'interface)
2. Ajouter des exemples visuels (photo de chaque matériau)
3. Simplifier l'onglet pour livraison+décharge (plus clair)

### Étape 4 — Récapitulatif

**Champs actuels:**
- Récapitulatif complet (lecture seule)
- Notes — textarea
- Bouton submit

**Analyse:**
- ✅ Récapitulatif clair
- ✅ Possibilité modifier chaque section
- ✅ Notes optionnel
- ✅ Bouton submit bien placé

**Recommandations:**
1. Rendre le bouton submit plus spécifique: "Obtenir mon devis" au lieu de "Envoyer ma demande"
2. Ajouter une assurance "Email envoyé à [email] et tvm38@midali.fr" juste après le submit

---

## Optimisation des champs

### Champ Email
**État actuel:** ✅ Bon
- Validation intégrée ✅
- Autocomplétion disponible ✅

**Recommandation:** Aucune

### Champs Nom
**État actuel:** Nom + Prénom séparés
**Impact:** +1 champ = ~10-25% réduction du taux de complétion

**Test recommandé:** Fusionner en "Nom complet" avec placeholder "Ex: Jean Dupont"

### Champ Téléphone
**État actuel:** ✅ Bon
- Validation française ✅
- Autocomplétion ?

**Recommandation:** Ajouter autocomplétion si possible

### Champ Adresse
**État actuel:** ✅ Excellent
- Autocomplétion ✅

**Recommandation:** Aucune

### Champs Autocomplétion (Entreprise, Agence)
**État actuel:** ✅ Excellent

**Recommandation:** Aucune

### Dropdown Type Demande
**État actuel:** Radio buttons — correct car < 5 options

**Recommandation:** Aucune

---

## Layout du formulaire

### Ordre des champs
**Analyse:**
- Étape 1: Coordonnées — commence par le plus facile (type client)
- Étape 2: Projet — engagement avant le détail
- Étape 3: Matériaux — le cœur du devis
- Étape 4: Récapitulatif — synthèse finale

**Recommandation:** ✅ Ordre optimal

### Labels et Placeholders
**État actuel:** ✅ Labels clairs, placeholders informatifs

**Recommandation:** Aucune

### Design visuel
**Analyse:**
- Bon espacement entre champs ✅
- Hiérarchie visuelle claire ✅
- CTA bouton visible ✅
- Mobile-friendly (à vérifier)

**Recommandation:**
- Augmenter la taille des targets tactiles sur mobile (minimum 44px de hauteur)

### Single vs. Multi-colonne
**Analyse:**
- Single colonne partout ✅
- Mobile-friendly ✅

**Recommandation:** Aucune

---

## Formulaire multi-étape

### Quand utiliser multi-étape
**Critères:**
- Plus de 5-6 champs → ✅ (15-20 champs)
- Sections logiquement distinctes → ✅ (Coordonnées, Projet, Matériaux, Récapitulatif)
- Chemins conditionnels → ✅ (Pro vs. Particulier)

**Recommandation:** ✅ Structure multi-étape justifiée

### Meilleures pratiques multi-étape
- Indicateur de progression ✅ (barre étapes)
- Commencer par facile → ✅
- Un sujet par étape ✅
- Navigation arrière possible ✅
- Sauvegarde du progrès ✅ (lignes stockées)
- Indication obligatoire/optionnel → ⚠️ Peut être amélioré

**Recommandation:** Ajouter un indicateur visuel plus clair des champs obligatoires vs optionnels

---

## Gestion des erreurs

### Validation inline
**État actuel:**
- Validation React Hook Form + Zod ✅
- Messages d'erreur en rouge ✅

**Recommandation:** Aucune

### Messages d'erreur
**État actuel:** Messages spécifiques et utiles ✅

**Recommandation:** Aucune

---

## Bouton submit

### Copy du bouton
**État actuel:** "Envoyer ma demande →"

**Analyse:**
- Action: Envoyer (verbe) ✅
- But: ma demande (object) ✅

**Alternatives suggérées:**
1. "Obtenir mon devis gratuit"
2. "Recevoir mon devis par email"
3. "Finaliser ma demande de devis"

**Recommandation:** Tester "Obtenir mon devis" ou "Recevoir mon devis"

### Placement du bouton
**État actuel:** ✅ Centre, après le dernier champ

**Recommandation:** Aucune

---

## Confiance et réduction de friction

### Près du formulaire
**Éléments actuels:**
- ✅ "Devis gratuit, sans engagement" — Étape 4
- ✅ "Environ 2 minutes — sans engagement, devis gratuit" — Étape 1

**Manque:**
- Confidentialité des données
- Temps de réponse attendu

**Recommandations:**
1. Ajouter: "Vos données restent confidentielles et servent uniquement à établir votre devis"
2. Ajouter: "Réponse par email sous 48h (ou selon disponibilité des stocks)"

---

## Optimisation mobile

**Analyse à faire:**
- Vérifier la taille des targets tactiles
- Vérifier que le submit button reste visible

**Recommandations:**
- Tester sur mobile: tous les tap targets doivent faire 44px+ de hauteur
- Bouton submit sticky en bas de l'écran sur mobile

---

## Résumé des problèmes

### Problèmes identifiés (priorité haute)

1. **Nom + Prénom séparés** — ajoute friction inutile
2. **Champ Fonction obligatoire** — pour une partie des pros
3. **Pas d'aide estimation rapide** — malgré la sidebar
4. **Confidentialité non mentionnée** — réassurance manquante
5. **Indicateur obligatoire/optionnel pas clair** — confusion possible

### Problèmes identifiés (priorité moyenne)

1. **Date souvenue** — pourrait être plus ergonomique
2. **Bouton submit** — peut être plus spécifique
3. **Pas d'exemple visuel matériaux** — pourrait aider

### Forces du formulaire

1. ✅ Multi-étape bien conçu
2. ✅ Barre de progression claire
3. ✅ Autocomplétion entreprises
4. ✅ Validation téléphone française
5. ✅ Conversion tonnes/m³ en temps réel
6. ✅ Modification possible récapitulatif

---

## Recommandations par priorité

### Gagnes rapides (à implémenter maintenant)

1. **Ajouter mention confidentialité:** "Vos données restent confidentielles..."
2. **Fusionner Nom + Prénom** en champ unique avec placeholder clair
3. **Rendre Fonction optionnel** (pas required)

### Changements à fort impact (à prioriser)

1. **Ajouter calculateur rapide:** Intégré dans l'interface matériaux
2. **Tester bouton submit:** "Obtenir mon devis" vs "Envoyer ma demande"
3. **Améliorer indication obligatoire/optionnel:** Badge visuel

### Idées de test (A/B testing)

1. **Structure nom:**
   - Version A: Nom + Prénom (actuel)
   - Version B: Nom complet unique

2. **Bouton submit:**
   - Version A: "Envoyer ma demande →" (actuel)
   - Version B: "Obtenir mon devis gratuit"

3. **Layout mobile:**
   - Version A: Single colonne (actuel)
   - Version B: Optimisé pour mobile (targets 44px+)

---

## Alternative de copy

### Labels champs

| Champ | Actuel | Alternative 1 | Alternative 2 |
|--------|----------|---------------|---------------|
| Nom | Nom / Prénom | Nom complet | Votre nom |
| Téléphone | Téléphone | Téléphone (optionnel) | Comment vous contacter |
| Adresse | Adresse de livraison | Où livrer ? | Lieu de livraison |

### Bouton submit

| Actuel | Alternative 1 | Alternative 2 |
|---------|---------------|---------------|
| Envoyer ma demande → | Obtenir mon devis | Recevoir mon devis par email |
| | Finaliser ma demande de devis | Valider ma commande |

---

## Questions à poser

1. Quel est votre taux de complétion actuel du formulaire ?
2. Avez-vous des analytics sur le moment d'abandon des utilisateurs ?
3. Où abandonnent-ils le plus souvent ?
4. Mobile vs Desktop — quel est le split ?
