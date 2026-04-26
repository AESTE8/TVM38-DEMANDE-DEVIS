# Analyse UX Mobile — Site TVM38

*Date: 2026-04-26*
*Objectif: Identifier les problèmes d'utilisabilité mobile et proposer des solutions

---

## Vue d'ensemble

**Pages analysées:**
- LoginPage.tsx
- FormPage.tsx
- EstimationPage.tsx
- SuccessPage.tsx

---

## Problèmes identifiés

### 1. Page de Connexion (LoginPage.tsx)

#### Problème 1 : Logo trop petit
**État actuel:**
- Logo height: `h-16 md:h-20`
- Sur mobile, seulement 20px de hauteur

**Impact:**
- Logo peu visible, branding affaibli
- Premier élément de la page manque d'impact visuel

**Recommandation:**
- `h-20 md:h-28` pour une meilleure visibilité mobile
- `w-32 md:w-48` pour garder l'équilibre

#### Problème 2 : CTA "Continuer sans compte" peu visible
**État actuel:**
- Bouton en texte avec icon (pas en gras)
- Moins mis en avant que le bouton de connexion

**Impact:**
- Utilisateurs peuvent ne pas voir l'option principale

**Recommandation:**
- Remplacer le bouton par un bouton stylé avec `bg-primary`
- Ajouter `font-bold` pour plus de visibilité

#### Problème 3 : Modal de contact/avis mal dimensionnée sur mobile
**État actuel:**
- Modal width: `max-width: 480px`
- Padding: `px-4` (peu sur mobile)

**Impact:**
- Contenu mal lisible sur petits écrans
- Bouton fermeture en haut à droite peut être difficile à toucher

**Recommandation:**
- Mobile: `padding: 20px`, `width: 90vw`
- Bouton fermeture: augmenter taille à `w-8 h-8` avec padding `p-4`
- Centrer verticalement avec `items-center`

#### Problème 4 : Boutons flottants mal positionnés
**État actuel:**
- `bottom: 24px; left: 24px` (contact) et `bottom: 72px;` (contact)
- Mobile: `padding: 14px` — risque de chevauchement

**Impact:**
- Chevauchement avec la barre de progression en haut
- Espace d'écran mal utilisé

**Recommandation:**
- Sur mobile, déplacer les boutons plus bas (ou les cacher sur mobile)
- Ajouter `z-index` plus élevé pour les modals

---

### 2. Page Formulaire (FormPage.tsx)

#### Problème 5 : Barre de progression peu lisible sur mobile
**État actuel:**
- Texte "Étape X/4 — [Label]" avec fontSize `text-xs`
- Icônes 8x8 de diamètre

**Impact:**
- Sur mobile, le texte peut être difficile à lire
- Les icônes sont trop petites pour être cliquées facilement

**Recommandation:**
- Augmenter le texte à `text-sm` sur mobile
- Agrandir les icônes à `w-10 h-10` (44px minimum)
- Augmenter l'espacement entre les icônes et le texte

#### Problème 6 : Carte formulaire avec bordure fine sur mobile
**État actuel:**
- Card: `bg-surface-container-lowest p-6 md:p-10 shadow-sm rounded-xl border-t-4`
- Bordure: `border-t-4 border-primary/80`

**Impact:**
- Sur mobile, la bordure supérieure consomme de l'espace précieux
- Contenu peut être trop proche du bord de l'écran

**Recommandation:**
- Mobile: réduire le padding à `p-4 md:p-6`
- Supprimer la bordure supérieure ou la réduire sur mobile (`border-t-2 md:border-t-4`)

#### Problème 7 : Labels et inputs mal espacés sur mobile
**État actuel:**
- Labels avec `mb-1.5` ou `mb-3`
- Inputs avec padding `py-3`

**Impact:**
- Sur mobile, l'espacement consomme trop d'espace vertical

**Recommandation:**
- Mobile: réduire à `mb-1 md:mb-1.5` pour labels
- Mobile: inputs avec `py-2.5 md:py-3` au lieu de `py-3`

#### Problème 8 : Barre de progression manque de responsive sur mobile
**État actuel:**
- Barre fixe en haut (`sticky top-0`)
- Largeur du container: `max-w-2xl mx-auto px-4`

**Impact:**
- Sur mobile (<=640px), container large mais padding réduit
- Barre peut être compressée et illisible

**Recommandation:**
- Mobile: `px-2 md:px-4` pour la barre de progression
- Ajuster le texte des étapes sur mobile (`text-[10px]`)

#### Problème 9 : Inputs sans min-height sur mobile
**État actuel:**
- Les classes CSS ajoutées récemment (min-height: 44px) mais peuvent ne pas s'appliquer correctement

**Impact:**
- Possibilité que les inputs soient encore trop petits

**Recommandation:**
- Vérifier que les classes sont bien appliquées (le fichier index.css a été modifié)
- Tester sur un vrai device mobile

#### Problème 10 : Boutons navigation mal dimensionnés
**État actuel:**
- "Retour" : `text-sm` avec `w-4 h-4` icônes
- "Suivant" : `px-8 py-3` 

**Impact:**
- Bouton retour peut être difficile à toucher (seulement 16px de hauteur totale)
- Bouton suivant manque de contraste visuel

**Recommandation:**
- Bouton retour: `min-height: 44px`, `px-4 py-2`
- Bouton suivant: `min-height: 44px`, `px-6 py-2.5`

---

### 3. Page Avis (EstimationPage.tsx)

#### Problème 11 : Widgets étoiles trop petits
**État actuel:**
- `.est-star-btn` : `font-size: 48px`
- Sur mobile, l'espacement entre les étoiles est seulement `gap: 10px`

**Impact:**
- Difficile de sélectionner la bonne étoile sans toucher à côté
- Les étoiles dépassent les bords des autres éléments

**Recommandation:**
- Mobile: `font-size: 36px` avec `gap: 6px`
- Augmenter la zone de clic (padding autour de chaque étoile)
- Ajouter un padding vertical autour du widget

#### Problème 12 : Boutons flottants mal positionnés
**État actuel:**
- Voir problème déjà identifié en page connexion
- Position fixe sans gestion de l'overlay

**Recommandation:**
- Masquer sur mobile ou déplacer vers le bas

#### Problème 13 : Card principale trop large pour mobile
**État actuel:**
- `.est-card` : `max-width: 500px; width: 100%;`

**Impact:**
- Sur mobile, la carte occupe presque tout l'écran avec peu de marge

**Recommandation:**
- Mobile: `max-width: 90vw; width: 90%; padding: 20px`
- Conserver `max-width: 500px; width: 100%; padding: 52px 44px` sur desktop

---

### 4. Page Succès (SuccessPage.tsx)

#### Problème 14 : Contenu mal centré sur mobile
**État actuel:**
- Widget créateur en bas à droite (`bottom-5 right-5`)
- Peut gêner l'expérience sur mobile

**Impact:**
- Éléments principaux masqués par le widget flottant
- Expérience fragmentée

**Recommandation:**
- Mobile: masquer le widget ou le mettre moins intrusif
- Réduire sa taille et la déplacer plus bas

---

## Résumé des améliorations prioritaires

### Gagnes rapides

1. **Logo plus visible** — `h-20 md:h-28`
2. **Logo plus large** — `w-32 md:w-48`
3. **CTA connexion plus visible** — Bouton stylé avec `bg-primary`
4. **Espace boutons mobile** — Déplacer ou agrandir sur mobile
5. **Barre progression mobile** — Ajuster padding et texte
6. **Espace formulaire mobile** — Réduire padding sur mobile

### Changements à fort impact

1. **Icônes étapes plus grandes** — `w-10 h-10` au lieu de `8x8`
2. **Boutons navigation accessibles** — `min-height: 44px`
3. **Cards formulaire optimisées** — Réduire padding et bordure sur mobile
4. **Widgets étoiles accessibles** — Plus d'espace, taille adaptée

---

## Erreurs / Bugs détectés

### Aucune erreur critique
- Pas d'erreur bloquante identifiée
- Le site semble fonctionnel globalement

---

## Tests recommandés

1. Tester sur mobile réel (Android/iOS)
2. Vérifier le responsive en mode paysage
3. Tester l'accessibilité avec lecteur d'écran
4. Tester avec différents sizes d'écran (SE, XL, S, M)
