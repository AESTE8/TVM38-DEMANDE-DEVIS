# Analyse CRO — Site TVM38

*Date: 2026-04-26*

---

## Vue d'ensemble

**Page Type:** Multi-page (Connexion → Formulaire → Succès + Page Avis séparée)
**Primary Conversion Goal:** Remplir et soumettre une demande de devis
**Traffic Context:** Probablement local (Isère/Grésivaudan), bouche-à-oreille, recherche Google

---

## Analyse page par page

### 1. Page de Connexion (LoginPage.tsx)

#### Force de la proposition de valeur

**État actuel:**
- Titre: "Votre devis granulats en 3 minutes"
- Logo TVM38 bien placé (✓)
- Preuve sociale: "350+ professionnels du BTP", "1937 présents dans le Grésivaudan"

**Observation:**
- Le titre est clair et parle au bénéfice principal (3 minutes)
- La preuve sociale est pertinente mais pourrait être plus visuelle

**Recommandation:** ✅ Bon, titre clair. Peut ajouter une photo de camion ou de livraison pour renforcer le visuel.

#### Efficacité du headline

**État actuel:**
- "Votre devis granulats en 3 minutes" — spécifique, parle bénéfice

**Alternatives suggérées:**
1. "Obtenez votre devis matériaux en 3 minutes — livraison en Isère"
2. "Devis granulats rapide — 350+ professionnels font confiance"
3. "Vos matériaux livrés en Isère — devis en 2 minutes"

#### Placement, copy et hiérarchie des CTA

**État actuel:**
- CTA principal: "Continuer sans compte" + bouton connexion
- CTA secondaire: "Pas encore client ?"

**Problème:**
- Deux CTA concurrents créent de la confusion
- "Continuer sans compte" pourrait faire passer à côté du compte client existant

**Recommandations:**
- Mettre en avant le CTA de connexion pour les clients existants
- CTA "Continuer sans compte" en option secondaire plus discrète

#### Hiérarchie visuelle

**État actuel:**
- Carte de login bien centrée
- Good spacing

**Recommandations:** ✅ Bon

#### Signaux de confiance

**État actuel:**
- 350+ professionnels BTP
- 1937 présents dans le Grésivaudan

**Manque:**
- Témoignage de client avec photo
- Logo de collectivité (si applicable)

**Recommandation:** Ajouter 1-2 témoignages avec photo de chantier ou visage.

---

### 2. Page Formulaire (FormPage.tsx)

#### Barre de progression

**État actuel:**
- 4 étapes clairement affichées
- Indicateur visuel de progression

**Recommandation:** ✅ Excellent, très clair.

#### Étape 1 — Coordonnées

**Observation:**
- Formulaire bien structuré
- Autocomplétion entreprises disponible

**Friction potentielle:**
- Si client connecté, le formulaire est déjà pré-rempli ✅
- Mais pas clairement indiqué si les données viennent du compte

**Recommandation:** Ajouter une petite note "Données pré-remplies depuis votre compte client" si connecté.

#### Étape 2 — Projet

**Observation:**
- Choix type demande (livraison, fourniture, décharge, livraison+décharge)
- Adresse livraison autocomplétion ✅

**Recommandations:** ✅ Bon.

#### Étape 3 — Matériaux

**Observation:**
- Sidebar "Infos pratiques" avec capacités camions
- Matériaux par section
- Onglets pour livraison/décharge (quand applicable)

**Point fort:**
- Sidebar sticky aide vraiment à estimer les quantités

**Amélioration possible:**
- Ajouter un calculateur rapide en bas de la sidebar (ex: "Pour une surface de X m² à Y cm de profondeur → environ Z tonnes")

#### Étape 4 — Récapitulatif

**Observation:**
- Récapitulatif clair et structuré
- Boutons "Modifier" visibles

**Recommandations:** ✅ Bon.

#### Objections non traitées

**Observation:**
- Pas de FAQ ou section questions fréquentes
- "Comment estimer les quantités ?" n'est pas traité

**Recommandation:** Ajouter 3 questions fréquentes:
1. "Comment estimer la quantité de matériaux ?"
2. "Quels sont les frais de livraison ?"
3. "Puis-je modifier ma commande après l'envoi ?"

---

### 3. Page Succès (SuccessPage.tsx)

#### État actuel:**
- Icône de confirmation
- Message: "Merci, on s'occupe de tout."
- Preuve sociale adaptée pro/particulier
- Boutons: "Nouvelle demande" + "Laisser un avis"

#### Problème identifié:
- Le widget "Un mot du créateur" prend de la place et peut distraire
- L'avis demandé immédiatement peut ne pas être sincère (expérience pas vécue)

**Recommandations:**
- Retarder le CTA avis à 24h après la demande (email automatique)
- Masquer le widget créateur par défaut

---

### 4. Page Avis (EstimationPage.tsx)

#### État actuel:**
- Système d'étoiles interactif
- Modal de formulaire pour avis
- Bouton contact et bouton carrière

#### Problèmes identifiés:

**Problème 1: Widget évaluation négatif non demandé**
- Si l'utilisateur clique sur 3 étoiles ou moins, le modal s'ouvre
- Mais pour 4-5 étoiles, on envoie directement vers Google Reviews
- Incohérent: 5 étoiles = Google, 3 étoiles = formulaire interne

**Recommandation:** Unifier le flux — soit tout passer par Google, soit tout passer par formulaire interne (avec détection automatique sur Google pour les avis 4-5 étoiles).

**Problème 2: Pas d'explication du type d'avis**
- L'utilisateur ne sait pas ce qui se passe quand il clique sur les étoiles

**Recommandation:** Ajouter un petit texte sous les étoiles:
"Cliquez sur votre note. 4-5 étoiles = avis public Google | 1-3 étoiles = retour privé pour nous améliorer"

**Problème 3: Pas de réassurance sur l'utilisation de l'avis**
- Pourquoi TVM38 veut mon avis ?

**Recommandation:** Ajouter: "Votre avis nous aide à améliorer nos services pour tous les clients."

---

## Résumé des recommandations par priorité

### Gagnes rapides (à implémenter maintenant)

1. **Page formulaire — Étape 3:** Ajouter un calculateur rapide dans la sidebar (surface × profondeur → tonnes)
2. **Page formulaire — Ajouter FAQ:** 3 questions fréquentes en bas de la page
3. **Page formulaire — Étape 1:** Indiquer "Données pré-remplies depuis votre compte" si connecté
4. **Page avis:** Expliquer le fonctionnement (Google vs formulaire)

### Changements à fort impact (à prioriser)

1. **Page connexion:** Ajouter 1-2 témoignages avec photo pour renforcer la preuve sociale
2. **Page connexion:** Réorganiser les CTA — mettre "Se connecter" en avant pour les clients existants
3. **Page succès:** Retarder le CTA avis à 24h et supprimer le widget créateur

### Idées de test (A/B testing)

1. **Headline page connexion:**
   - Version A: "Votre devis granulats en 3 minutes" (actuel)
   - Version B: "Devis matériaux — livraison en Isère en 24h"

2. **CTA page connexion:**
   - Version A: "Continuer sans compte" (actuel)
   - Version B: "Obtenir mon devis en 2 minutes — sans compte"

3. **Page avis — flux unifié:**
   - Version A: Google pour 4-5 étoiles, formulaire pour 1-3 (actuel)
   - Version B: Tout passer par formulaire interne avec option de publier sur Google

---

## Alternatives de copy

### Headline page connexion
- **Actuel:** "Votre devis granulats en 3 minutes"
- **Alternative 1:** "Obtenez votre devis en 2 minutes — livraison gratuite en Isère"
- **Alternative 2:** "350+ pros BTP font confiance — votre devis en 3 minutes"

### CTA principal page connexion
- **Actuel:** "Continuer sans compte"
- **Alternative 1:** "Commencer sans compte"
- **Alternative 2:** "Demander mon devis — sans inscription"

### CTA page formulaire — Étape 4
- **Actuel:** "Envoyer ma demande →"
- **Alternative 1:** "Obtenir mon devis gratuit"
- **Alternative 2:** "Recevoir mon devis par email"

---

## Notes générales

**Points forts:**
- Design cohérent et professionnel
- Bonne hiérarchie visuelle
- Barre de progression très claire
- Sidebar capacities camions très utile

**Points à améliorer:**
- Plus de preuve sociale (témoignages)
- Plus de réassurance (FAQ)
- Flux avis simplifié et cohérent
- Meilleure gestion des objections
