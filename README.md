# TVM38 — Portail Demande de Devis & Avis

Ce projet est une application web React (Vite) permettant aux clients de TVM38 de soumettre des demandes de devis et de laisser des avis de satisfaction. Elle est intégrée à une base de données Supabase partagée avec l'application métier de la carrière.

## 🛠 Technologies
- **Frontend** : React 19, TypeScript, Vite 8, Tailwind CSS
- **Formulaires** : React Hook Form + Zod
- **Backend & DB** : Supabase (PostgreSQL)
- **Emails** : Web3Forms / Resend
- **Déploiement** : Prêt pour Netlify

## 🚀 Installation locale

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/AESTE8/TVM38-DEMANDE-DEVIS.git
   cd TVM38-DEMANDE-DEVIS
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configuration de l'environnement** :
   Créez un fichier `.env` à la racine (basé sur `.env.example`) avec les clés Supabase :
   ```env
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   VITE_WEB3FORMS_KEY=votre_cle_web3forms
   ```

4. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```

## 📄 Pages principales
- `/` : Formulaire de demande de devis (principal).
- `/estimation` : Page de récolte d'avis de satisfaction.
- `/merci` : Page de confirmation après envoi.

## 🗄 Structure de la base (Supabase)
L'application interagit avec la table `clients` pour l'autocomplétion et la persistance des nouveaux contacts (via le champ JSONB `contacts`).
Les politiques RLS doivent autoriser le `SELECT` public et l'`UPDATE` (pour l'ajout de contacts).
