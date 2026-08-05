-- Les décisions prises depuis l'espace client restent visibles dans le devis,
-- mais le logiciel interne doit également savoir si un opérateur les a déjà
-- consultées. La fermeture de la fenêtre d'information renseigne ces colonnes.

alter table public.devis
  add column if not exists client_action_seen_at timestamptz,
  add column if not exists client_action_seen_by text;

create index if not exists devis_client_action_non_vue_idx
  on public.devis (client_action_at desc)
  where client_action is not null and client_action_seen_at is null;

comment on column public.devis.client_action_seen_at is
  'Date de consultation de la réponse client dans le logiciel interne.';
comment on column public.devis.client_action_seen_by is
  'Identifiant de l opérateur ayant fermé la notification.';
