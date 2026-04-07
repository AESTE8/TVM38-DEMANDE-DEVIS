# Design UX — Formulaire en tunnel guidé

## Contexte

Formulaire de demande de devis TVM38 (matériaux BTP : livraison ou fourniture).
Utilisateurs principaux : clients existants, seuls, depuis téléphone ou ordinateur.
Objectifs : vitesse, clarté, confiance.

---

## Understanding Summary

- Formulaire utilisé par des **clients existants qui se servent seuls** (téléphone ou desktop, parts égales)
- Aucun problème critique rapporté — amélioration proactive
- Objectifs simultanés : aller plus vite, mieux comprendre, avoir confiance jusqu'à l'envoi
- Le pré-remplissage depuis Supabase est la fonctionnalité centrale
- Les clients raisonnent par **nom de matériau**, pas par code technique

## Hypothèses

- Le pré-remplissage doit être instantané et visible (bandeau de bienvenue)
- Sur mobile (chantier), les interactions doivent être grandes et simples
- La section Matériaux est la plus complexe → c'est là que la clarté apporte le plus de valeur
- "Fourniture uniquement" est ambigu pour certains clients → une description courte lève le doute

---

## Design final

### Structure générale

Formulaire en **4 étapes séquentielles** avec barre de progression horizontale fixée sous le header.

```
[●━━━━] [○━━━━] [○━━━━] [○━━━━]
Coordonnées  Projet  Matériaux  Récapitulatif
```

- Étape active : cercle plein + texte couleur primaire
- Étapes passées : ✓ + texte grisé **cliquable** (retour autorisé)
- Étapes futures : grisées, non cliquables
- Bouton "Continuer" désactivé tant que les champs obligatoires ne sont pas valides
- Bouton "← Retour" sur toutes les étapes sauf la première
- Données conservées lors des allers-retours
- Bloc image + "Pourquoi nous choisir ?" visible uniquement à l'étape 1

---

### Étape 1 — Coordonnées

**Question initiale (deux grandes cartes cliquables) :**

```
┌─────────────────┐   ┌─────────────────┐
│   ✓ Oui         │   │   + Non         │
│ J'ai déjà un    │   │ Je n'ai pas     │
│ compte TVM38    │   │ encore de compte│
└─────────────────┘   └─────────────────┘
```

**Si "Oui" :**
- Champ de recherche autocomplétion Supabase
- Pré-remplissage immédiat des champs
- Bandeau : *"✓ Bonjour [Prénom], vos informations ont été retrouvées. Vérifiez et modifiez si besoin."*

**Si "Non" :**
- Champs manuels (Prénom, Nom, Téléphone, Email + Entreprise/Adresse si pro)
- Bouton *"Demander votre ouverture de compte gratuite"* en bas de section

**Type de client** (Professionnel / Particulier) affiché dans les deux cas.

---

### Étape 2 — Projet

**Type de demande — cartes visuelles :**

```
┌──────────────────────┐   ┌──────────────────────┐
│  🚛 Livraison        │   │  📦 Fourniture        │
│  avec transport      │   │  uniquement           │
│                      │   │                       │
│  On livre sur votre  │   │  Vous venez récupérer │
│  chantier            │   │  les matériaux        │
└──────────────────────┘   └──────────────────────┘
```

**Si "Livraison" :**
- Adresse de livraison (autocomplétion + bouton "Même adresse que le siège" si pro)
- Date souhaitée (optionnel)
- Créneau (visible uniquement si une date est choisie)

**Si "Fourniture" :**
- Aucun champ supplémentaire
- Message contextuel : *"ℹ️ Vous récupérez les matériaux directement à notre carrière : 489 Rue de l'Isle, 38190 Villard-Bonnot"*

---

### Étape 3 — Matériaux

- **Codes masqués** (ou affichés en très petit, couleur secondaire)
- **Nom du matériau en grand** comme élément principal
- Carte cliquable → panneau quantité inline sous la carte (déjà implémenté)
- Badge bleu sur la carte quand une quantité est saisie
- Recherche avec placeholder : *"Ex : gravier, sable, tout-venant..."*

**Récapitulatif flottant :**
- Mobile : bandeau fixé en bas — *"3 matériaux sélectionnés — 24 t · Continuer →"*
- Desktop : résumé dans un bloc latéral

---

### Étape 4 — Récapitulatif & envoi

Résumé complet avec boutons ✏️ pour retourner à chaque étape :

```
┌─────────────────────────────────────┐
│ 👤 Contact                    ✏️   │
│  Jean-Pierre MARTIN                 │
│  06 12 34 56 78 · jp@btp.fr         │
├─────────────────────────────────────┤
│ 🏗️ Projet                    ✏️   │
│  Livraison — 15 mars 2026 (matin)   │
│  42 Rue des Chantiers, Grenoble     │
├─────────────────────────────────────┤
│ 📦 Matériaux                  ✏️   │
│  • Tout-venant 0/80 — 12 t          │
│  • Sable fin 0/4 — 6 t              │
└─────────────────────────────────────┘
```

- Champ **Notes** (optionnel) juste avant l'envoi : *"Une précision à ajouter ? (accès chantier, contraintes horaires...)"*
- Bouton *"Envoyer ma demande →"*
- Texte RGPD discret en dessous

---

### Page succès

```
✅ Demande envoyée !

Votre demande a bien été transmise.
Nous vous répondons dans les meilleurs délais.

[ Soumettre une nouvelle demande ]
[ ★ Laisser un avis ]
```

---

## Decision Log

| Décision | Alternative écartée | Raison |
|----------|--------------------|-|
| Tunnel séquentiel | Scroll continu | Meilleur guidage, validation par étape |
| Codes matériaux masqués | Codes visibles | Clients raisonnent par nom, pas par code |
| Cartes cliquables Livraison/Fourniture | Radio buttons | Description intégrée lève l'ambiguïté |
| Message "carrière" si Fourniture | Champ adresse vide | Rassure sans friction |
| Récap complet avant envoi | Envoi direct | Le client valide ce qu'il commande |
| Page succès avec lien avis | Page succès minimaliste | Capitalise sur la satisfaction post-envoi |
| Bouton ouverture de compte contextuel | Bouton dès le début | Moins intrusif, plus pertinent |
