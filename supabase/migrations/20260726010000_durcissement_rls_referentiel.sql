-- ============================================================================
-- Durcissement RLS des tables de référentiel
-- ============================================================================
-- Sans rapport direct avec l'espace client : problème détecté en vérifiant les
-- migrations précédentes avec le linter Supabase.
--
-- La clé publique du site est distribuée en clair dans le bundle JavaScript.
-- Une policy `for all to anon using (true) with check (true)` revient donc à
-- ouvrir la table en écriture à tout internaute. Sur `materiaux`, cela
-- permettait de modifier les prix au tonnage qui servent au chiffrage.
--
-- Vérifié avant application : le site n'a besoin que de LIRE `materiaux`
-- (src/pages/FormPage.tsx, récupération des code_article). Il n'utilise ni
-- `camions` (catalogue statique dans src/data/camions.ts) ni `chauffeurs`.
--
-- Les policies `authenticated` restent inchangées : le logiciel de la carrière
-- conserve exactement les mêmes droits qu'avant.

-- materiaux : lecture publique conservée, écriture retirée
drop policy if exists materiaux_anon_all on public.materiaux;
create policy materiaux_anon_select on public.materiaux
  for select to anon using (true);

-- camions / chauffeurs : aucun accès anon nécessaire
drop policy if exists camions_anon_all on public.camions;
drop policy if exists chauffeurs_anon_all on public.chauffeurs;

-- tranches_remise : RLS était désactivé, la table entièrement exposée.
-- L'activation et la policy vont ensemble — activer RLS seul bloquerait le
-- logiciel, qui lit cette table pour appliquer les remises.
alter table public.tranches_remise enable row level security;

drop policy if exists tranches_remise_authenticated_all on public.tranches_remise;
create policy tranches_remise_authenticated_all on public.tranches_remise
  for all to authenticated
  using (auth.jwt() is not null)
  with check (auth.jwt() is not null);
