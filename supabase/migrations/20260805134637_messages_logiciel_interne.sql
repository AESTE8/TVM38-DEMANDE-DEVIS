-- Lecture et traitement de la messagerie de l'espace client depuis le logiciel.

alter table public.messages_affaire
  add column if not exists lu_par_tvm38_at timestamptz,
  add column if not exists lu_par_tvm38_by text;

create index if not exists messages_affaire_tvm38_non_lus_idx
  on public.messages_affaire (created_at)
  where auteur = 'client' and lu_par_tvm38_at is null;

comment on column public.messages_affaire.lu_par_tvm38_at is
  'Date de consultation du message dans le logiciel interne.';
comment on column public.messages_affaire.lu_par_tvm38_by is
  'Identifiant de l opérateur ayant consulté le message.';
