-- Espace client : identification des chantiers, décisions et messagerie.
-- Le navigateur n'accède jamais directement à ces données : les écritures
-- passent par les Edge Functions qui identifient le client avec son JWT signé.

alter table public.demandes
  add column if not exists nom_chantier text,
  add column if not exists reference_client text;

alter table public.devis
  add column if not exists nom_chantier text,
  add column if not exists reference_client text,
  add column if not exists client_action text,
  add column if not exists client_action_at timestamptz,
  add column if not exists client_action_message text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'devis_client_action_check'
  ) then
    alter table public.devis
      add constraint devis_client_action_check
      check (client_action is null or client_action in ('accepte', 'refuse', 'modification_demandee'));
  end if;
end
$$;

create table if not exists public.messages_affaire (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients(id) on delete cascade,
  demande_id text references public.demandes(id) on delete cascade,
  devis_id text references public.devis(id) on delete cascade,
  auteur text not null check (auteur in ('client', 'tvm38')),
  type text not null default 'message' check (type in ('message', 'demande_modification')),
  contenu text not null check (char_length(contenu) between 1 and 2000),
  lu_par_client_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_affaire_cible_check
    check (demande_id is not null or devis_id is not null)
);

create index if not exists messages_affaire_client_created_idx
  on public.messages_affaire (client_id, created_at);
create index if not exists messages_affaire_demande_idx
  on public.messages_affaire (demande_id) where demande_id is not null;
create index if not exists messages_affaire_devis_idx
  on public.messages_affaire (devis_id) where devis_id is not null;

alter table public.messages_affaire enable row level security;

-- Les opérateurs connectés dans l'application interne peuvent traiter et
-- répondre aux messages. Le site client utilise exclusivement service_role
-- dans ses Edge Functions, après vérification de son JWT dédié.
revoke all on table public.messages_affaire from anon;
grant select, insert, update, delete on table public.messages_affaire to authenticated;

drop policy if exists messages_affaire_authenticated_all on public.messages_affaire;
create policy messages_affaire_authenticated_all on public.messages_affaire
  for all to authenticated
  using (true)
  with check (true);
