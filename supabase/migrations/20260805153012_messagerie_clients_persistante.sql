-- Une lecture ne vaut pas traitement : les conversations restent dans la
-- messagerie tant qu'une réponse ou une action explicite n'a pas eu lieu.

alter table public.messages_affaire
  add column if not exists traite_par_tvm38_at timestamptz,
  add column if not exists traite_par_tvm38_by text;

alter table public.devis
  add column if not exists client_action_handled_at timestamptz,
  add column if not exists client_action_handled_by text,
  add column if not exists client_conversation_archived_at timestamptz,
  add column if not exists client_conversation_archived_by text;

-- Les anciens échanges ayant déjà reçu une réponse TVM38 sont considérés
-- traités. Les messages restés sans réponse demeurent volontairement à traiter.
update public.messages_affaire as message_client
set
  traite_par_tvm38_at = (
    select min(reponse.created_at)
    from public.messages_affaire as reponse
    where reponse.devis_id = message_client.devis_id
      and reponse.auteur = 'tvm38'
      and reponse.created_at > message_client.created_at
  ),
  traite_par_tvm38_by = 'historique'
where message_client.auteur = 'client'
  and message_client.traite_par_tvm38_at is null
  and exists (
    select 1
    from public.messages_affaire as reponse
    where reponse.devis_id = message_client.devis_id
      and reponse.auteur = 'tvm38'
      and reponse.created_at > message_client.created_at
  );

-- Les anciennes acceptations/refus déjà consultés ne doivent pas encombrer la
-- nouvelle file. Une demande de modification reste à traiter jusqu'au renvoi.
update public.devis
set
  client_action_handled_at = client_action_seen_at,
  client_action_handled_by = coalesce(client_action_seen_by, 'historique')
where client_action in ('accepte', 'refuse')
  and client_action_seen_at is not null
  and client_action_handled_at is null;

create index if not exists messages_affaire_tvm38_a_traiter_idx
  on public.messages_affaire (created_at desc)
  where auteur = 'client' and traite_par_tvm38_at is null;

create index if not exists devis_client_action_a_traiter_idx
  on public.devis (client_action_at desc)
  where client_action is not null and client_action_handled_at is null;

comment on column public.messages_affaire.traite_par_tvm38_at is
  'Date de réponse ou de traitement explicite du message par TVM38.';
comment on column public.messages_affaire.traite_par_tvm38_by is
  'Opérateur ayant traité le message client.';
comment on column public.devis.client_action_handled_at is
  'Date de traitement de la décision ou demande de modification du client.';
comment on column public.devis.client_action_handled_by is
  'Opérateur ayant traité la décision client.';
comment on column public.devis.client_conversation_archived_at is
  'Date d archivage manuel de la conversation dans le logiciel.';
comment on column public.devis.client_conversation_archived_by is
  'Opérateur ayant archivé la conversation.';
