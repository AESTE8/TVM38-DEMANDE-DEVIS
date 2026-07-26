-- ============================================================================
-- Espace client — demandes web, rattachement des devis, fraîcheur du montant
-- ============================================================================
-- Toutes les modifications sont additives : nouvelle table + colonnes nullables.
-- Aucune colonne existante n'est modifiée ou supprimée, le logiciel desktop
-- continue de fonctionner sans changement.

-- ---------------------------------------------------------------------------
-- 1. Table `demandes` — les demandes de devis soumises depuis le site web
-- ---------------------------------------------------------------------------
-- Jusqu'ici une demande web n'existait que sous forme d'email. Elle est
-- désormais persistée pour que le client puisse la retrouver dans son espace,
-- et pour que le dispatcher puisse la convertir en devis.

create table if not exists public.demandes (
  id text primary key default gen_random_uuid()::text,

  -- Rattachement au compte client (null si demande faite en mode invité)
  client_id text references public.clients(id) on delete set null,

  -- Identité telle que saisie au moment de la demande. On la fige : le client
  -- peut changer de raison sociale ou de contact après coup, la demande doit
  -- rester le reflet de ce qui a été envoyé.
  type_client        text not null default 'professionnel',
  deja_client        text,
  entreprise_nom     text,
  entreprise_adresse text,
  agence_nom         text,
  contact_nom        text,
  contact_prenom     text,
  contact_fonction   text,
  contact_telephone  text,
  contact_email      text,

  -- Le contenu de la demande
  type_demande      text not null default 'livraison',
  adresse_livraison text,
  camion_livraison  text,
  engin_chantier    text,
  date_souhaitee    text,
  creneau           text,
  lignes            jsonb not null default '[]'::jsonb,
  notes             text,

  -- Suivi côté dispatcher
  -- envoyee      : reçue, pas encore ouverte
  -- en_traitement: le dispatcher chiffre
  -- devisee      : un devis a été créé (voir devis.demande_id)
  -- sans_suite   : abandonnée
  statut text not null default 'envoyee',
  source text not null default 'web',

  created_at timestamptz not null default now()
);

create index if not exists demandes_client_id_idx  on public.demandes (client_id);
create index if not exists demandes_created_at_idx on public.demandes (created_at desc);

alter table public.demandes enable row level security;

-- Le logiciel desktop (authenticated) a tous les droits.
-- Le site web n'accède JAMAIS à cette table directement : il passe par les
-- edge functions en service_role, qui filtrent sur le client du JWT.
drop policy if exists demandes_authenticated_all on public.demandes;
create policy demandes_authenticated_all on public.demandes
  for all to authenticated
  using (auth.jwt() is not null)
  with check (auth.jwt() is not null);

-- ---------------------------------------------------------------------------
-- 2. Rattachement des devis au compte client
-- ---------------------------------------------------------------------------
-- `nom_client` est du texte libre : il ne peut pas servir de clé fiable dans la
-- durée (un client renommé dans le logiciel perdrait tout son historique).

alter table public.devis add column if not exists client_id  text references public.clients(id) on delete set null;
alter table public.devis add column if not exists demande_id text references public.demandes(id) on delete set null;

create index if not exists devis_client_id_idx  on public.devis (client_id);
create index if not exists devis_demande_id_idx on public.devis (demande_id);

-- ---------------------------------------------------------------------------
-- 3. Fraîcheur du montant
-- ---------------------------------------------------------------------------
-- `montant_envoye` fige le montant au moment où le devis part chez le client.
-- Si le dispatcher modifie ensuite le devis, `montant_total_ht` diverge et
-- l'espace client peut afficher explicitement « ce montant remplace celui de
-- l'email du ... » au lieu de laisser le client face à deux chiffres.

alter table public.devis add column if not exists updated_at     timestamptz not null default now();
alter table public.devis add column if not exists montant_envoye real;
alter table public.devis add column if not exists date_envoi_at  timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Stockage du PDF (Google Drive, fichier privé)
-- ---------------------------------------------------------------------------
-- Seul l'identifiant Drive est stocké. Le lien n'est jamais exposé au client :
-- le téléchargement est proxifié par l'edge function devis-pdf, qui vérifie
-- que le devis appartient bien au client connecté.

alter table public.devis add column if not exists drive_file_id    text;
alter table public.devis add column if not exists drive_updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- 5. Trigger : updated_at + capture du montant à l'envoi
-- ---------------------------------------------------------------------------
-- Placé en base plutôt que dans le logiciel : le montant de référence est ainsi
-- capturé quoi qu'il arrive, y compris si un devis est modifié directement en
-- SQL ou depuis une future interface.

create or replace function public.devis_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    -- Devis inséré déjà envoyé (cas normal du logiciel : chiffrage puis envoi)
    if coalesce(new.date_envoi, '') <> '' then
      new.montant_envoye := new.montant_total_ht;
      new.date_envoi_at  := now();
    end if;

  -- Le devis part chez le client (ou est renvoyé à une nouvelle date) :
  -- on refige la référence, l'écart repart de zéro.
  elsif coalesce(new.date_envoi, '') <> ''
        and coalesce(old.date_envoi, '') is distinct from coalesce(new.date_envoi, '') then
    new.montant_envoye := new.montant_total_ht;
    new.date_envoi_at  := now();
  end if;

  return new;
end;
$$;

drop trigger if exists devis_touch_trg on public.devis;
create trigger devis_touch_trg
  before insert or update on public.devis
  for each row execute function public.devis_touch();

-- ---------------------------------------------------------------------------
-- 6. Authentification client — hash des mots de passe
-- ---------------------------------------------------------------------------
-- `password` reste en place le temps de la migration (l'edge function bascule
-- chaque compte vers le hash à sa première connexion réussie), puis pourra être
-- supprimée. Voir supabase/functions/auth-client/index.ts.

alter table public.clients add column if not exists password_hash text;

-- ---------------------------------------------------------------------------
-- 7. Backfill de l'existant
-- ---------------------------------------------------------------------------
-- Vérifié au préalable : les 61 devis existants correspondent tous exactement à
-- un client unique par `nom_client`, sans ambiguïté.

update public.devis d
set client_id = c.id
from public.clients c
where d.client_id is null
  and lower(trim(c.nom)) = lower(trim(d.nom_client));

-- Les devis déjà envoyés n'ont pas de montant de référence : on considère que
-- le montant actuel est celui que le client a reçu (pas de bandeau « modifié »
-- au premier chargement de l'espace client).
update public.devis
set montant_envoye = montant_total_ht
where montant_envoye is null
  and coalesce(date_envoi, '') <> '';
