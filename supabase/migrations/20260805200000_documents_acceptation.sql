-- Acceptation d'un devis par dépôt d'un justificatif commercial.
--
-- Le portail ne signe plus rien : le client transmet le devis signé ou son bon
-- de commande, et seule la validation par un opérateur fait passer le devis à
-- l'état accepté. Le dépôt vaut réception, jamais acceptation.
--
-- Trois invariants tiennent tout le reste :
--   1. un document est rattaché à une version précise du devis, empreinte
--      SHA-256 comprise, et n'est jamais réaffecté à une autre ;
--   2. une retouche visible d'un devis encore en négociation crée une nouvelle
--      version et rend caducs les documents déposés sur la précédente ;
--   3. passé la planification, une retouche est une régularisation de
--      livraison : ni version, ni document réclamé au client.

-- ---------------------------------------------------------------------------
-- 1. Colonnes de suivi sur devis
-- ---------------------------------------------------------------------------

alter table public.devis
  add column if not exists document_version integer not null default 1,
  add column if not exists pdf_sha256 text,
  add column if not exists acceptation_status text not null default 'none',
  add column if not exists document_acceptation_actif_id uuid,
  add column if not exists acceptation_requested_at timestamptz,
  add column if not exists acceptation_validated_at timestamptz,
  add column if not exists acceptation_validated_by text,
  add column if not exists remplace_par_devis_id text;

alter table public.devis drop constraint if exists devis_document_version_check;
alter table public.devis add constraint devis_document_version_check
  check (document_version >= 1);

alter table public.devis drop constraint if exists devis_acceptation_status_check;
alter table public.devis add constraint devis_acceptation_status_check
  check (acceptation_status in (
    'none', 'document_recu', 'regularisation_demandee', 'valide', 'rejete', 'obsolete'
  ));

comment on column public.devis.document_version is
  'Version du document présentée au client. Incrémentée à chaque retouche visible d un devis encore actionnable.';
comment on column public.devis.pdf_sha256 is
  'Empreinte du PDF actuellement mis à disposition. Verrou anti-substitution entre la lecture et le dépôt.';
comment on column public.devis.acceptation_status is
  'Synthèse du contrôle, dénormalisée pour les compteurs du logiciel. La vérité reste dans documents_acceptation.';
comment on column public.devis.remplace_par_devis_id is
  'Devis plus récent envoyé sur la même demande, qui a rendu celui-ci non actionnable.';

-- « Document reçu » n'est pas une acceptation : le client a transmis un
-- justificatif, la carrière ne s'est engagée sur rien. La valeur réutilise la
-- file « à traiter » déjà branchée sur client_action dans le logiciel, sans
-- laisser croire que le devis est accepté.
alter table public.devis drop constraint if exists devis_client_action_check;
alter table public.devis add constraint devis_client_action_check
  check (client_action is null or client_action in (
    'accepte', 'refuse', 'modification_demandee', 'document_recu'
  ));

-- ---------------------------------------------------------------------------
-- 2. Versions figées des devis envoyés
-- ---------------------------------------------------------------------------
-- Le fichier Drive d'une version envoyée n'est jamais réécrit : sans ça, on ne
-- peut plus montrer le devis exact sur lequel un bon de commande a été donné.

create table if not exists public.devis_versions (
  id uuid primary key default gen_random_uuid(),
  devis_id text not null references public.devis(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  version_number integer not null check (version_number >= 1),
  numero_devis text not null default '',
  drive_file_id text not null,
  pdf_sha256 text not null,
  montant_total_ht real not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (devis_id, version_number)
);

create index if not exists devis_versions_devis_idx
  on public.devis_versions (devis_id, version_number desc);

-- ---------------------------------------------------------------------------
-- 3. Documents d'acceptation
-- ---------------------------------------------------------------------------

create table if not exists public.documents_acceptation (
  id uuid primary key default gen_random_uuid(),

  client_id text not null references public.clients(id) on delete restrict,
  demande_id text references public.demandes(id) on delete set null,
  devis_id text not null references public.devis(id) on delete cascade,

  devis_version integer not null check (devis_version >= 1),
  devis_numero text not null default '',
  devis_pdf_sha256 text not null,
  devis_montant_ht real not null default 0,

  type_document text not null
    check (type_document in ('devis_signe', 'bon_commande')),

  drive_file_id text not null,
  drive_folder_type text not null
    check (drive_folder_type in ('devis_signes', 'bons_commande')),

  nom_fichier_original text not null,
  nom_fichier_drive text not null,
  mime_type text not null default 'application/pdf',
  taille_octets bigint not null check (taille_octets > 0),
  sha256 text not null,
  nb_pages integer,
  converti_depuis_images boolean not null default false,

  reference_bon_commande text,

  transmetteur_nom text not null,
  transmetteur_email text,
  transmetteur_fonction text,
  transmetteur_agence text,

  confirmation_correspondance boolean not null default false,
  confirmation_habilitation boolean not null default false,
  version_texte_confirmation text not null default '',

  statut text not null default 'a_verifier'
    check (statut in (
      'a_verifier',
      'valide',
      'regularisation_demandee',
      'rejete',
      'remplace',
      'obsolete_par_nouvelle_version'
    )),

  commentaire_client text,
  commentaire_controle text,

  adresse_ip text,
  user_agent text,

  depose_at timestamptz not null default now(),
  controle_at timestamptz,
  controle_par_id text,
  controle_par_nom text,

  remplace_par_id uuid references public.documents_acceptation(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un même fichier redéposé sur la même version est un double clic, pas un
-- second document. La contrainte le rend impossible côté base, quel que soit
-- le nombre d'onglets ouverts par le client.
create unique index if not exists documents_acceptation_doublon_idx
  on public.documents_acceptation (devis_id, devis_version, sha256);

-- Un seul document actif à la fois par devis.
create unique index if not exists documents_acceptation_actif_idx
  on public.documents_acceptation (devis_id)
  where statut in ('a_verifier', 'valide', 'regularisation_demandee');

create index if not exists documents_acceptation_client_idx
  on public.documents_acceptation (client_id, depose_at desc);
create index if not exists documents_acceptation_a_controler_idx
  on public.documents_acceptation (depose_at desc)
  where statut = 'a_verifier';

alter table public.devis
  drop constraint if exists devis_document_actif_fk;
alter table public.devis
  add constraint devis_document_actif_fk
  foreign key (document_acceptation_actif_id)
  references public.documents_acceptation(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Journal des évènements du dossier
-- ---------------------------------------------------------------------------
-- Uniquement ce qui porte une décision. La consultation d'un devis ou le
-- téléchargement d'un PDF ne sont pas tracés : gros volume, aucune valeur
-- probante, et une finalité de plus à justifier au titre du RGPD.

create table if not exists public.evenements_dossier (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete set null,
  demande_id text references public.demandes(id) on delete set null,
  devis_id text references public.devis(id) on delete set null,
  devis_version integer,
  document_id uuid references public.documents_acceptation(id) on delete set null,
  type text not null check (type in (
    'quote_version_created',
    'quote_superseded',
    'quote_refused',
    'quote_modification_requested',
    'acceptance_document_uploaded',
    'acceptance_document_upload_failed',
    'acceptance_document_replaced',
    'acceptance_document_obsoleted',
    'acceptance_validated',
    'acceptance_regularization_requested',
    'acceptance_rejected'
  )),
  acteur text not null check (acteur in ('client', 'operateur', 'systeme')),
  acteur_id text,
  acteur_nom text,
  adresse_ip text,
  user_agent text,
  donnees jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evenements_dossier_devis_idx
  on public.evenements_dossier (devis_id, created_at desc);
create index if not exists evenements_dossier_client_idx
  on public.evenements_dossier (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Messages système dans le fil partagé
-- ---------------------------------------------------------------------------

do $$
declare
  nom_contrainte text;
begin
  select conname into nom_contrainte
  from pg_constraint
  where conrelid = 'public.messages_affaire'::regclass
    and pg_get_constraintdef(oid) like '%demande_modification%'
  limit 1;

  if nom_contrainte is not null then
    execute 'alter table public.messages_affaire drop constraint ' || quote_ident(nom_contrainte);
  end if;
end
$$;

alter table public.messages_affaire add constraint messages_affaire_type_check
  check (type in ('message', 'demande_modification', 'systeme'));

-- ---------------------------------------------------------------------------
-- 6. Versionnement et invalidation
-- ---------------------------------------------------------------------------

create or replace function public.devis_versionner_et_invalider()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  changement_visible boolean;
  en_negociation boolean;
begin
  changement_visible :=
    new.nom_client is distinct from old.nom_client or
    new.date_devis is distinct from old.date_devis or
    new.adresse_livraison is distinct from old.adresse_livraison or
    new.creneau_livraison is distinct from old.creneau_livraison or
    new.lignes is distinct from old.lignes or
    new.camion_id is distinct from old.camion_id or
    new.montant_total_ht is distinct from old.montant_total_ht or
    new.type_client is distinct from old.type_client or
    new.type_devis is distinct from old.type_devis or
    new.prix_remise is distinct from old.prix_remise or
    new.remise_pct is distinct from old.remise_pct;

  -- Un devis planifié ou terminé n'est plus en négociation : ajuster le montant
  -- au tonnage réellement livré est une régularisation, pas un nouveau contrat.
  -- Réclamer un bon de commande pour une livraison déjà faite n'aurait aucun
  -- sens, et invaliderait une acceptation parfaitement valable.
  en_negociation := old.etat in ('envoye', 'accepte');

  if changement_visible and en_negociation then
    new.document_version := old.document_version + 1;
    new.pdf_sha256 := null;

    -- Une décision client portait sur la version précédente.
    if old.client_action is not null then
      new.client_action := null;
      new.client_action_at := null;
      new.client_action_message := null;
      new.client_action_seen_at := null;
      new.client_action_seen_by := null;
      new.client_action_handled_at := null;
      new.client_action_handled_by := null;
    end if;

    if old.acceptation_status <> 'none' then
      new.acceptation_status := 'obsolete';
      new.document_acceptation_actif_id := null;
      new.acceptation_validated_at := null;
      new.acceptation_validated_by := null;
    end if;

    if new.etat = 'accepte' then new.etat := 'envoye'; end if;
  end if;

  return new;
end;
$$;

drop trigger if exists devis_versionner_trg on public.devis;
create trigger devis_versionner_trg
  before update on public.devis
  for each row execute function public.devis_versionner_et_invalider();

/**
 * Effets de bord d'une nouvelle version, appliqués après écriture :
 * documents rendus caducs, message au client, évènement journalisé, et
 * archivage des devis plus anciens de la même demande.
 */
create or replace function public.devis_propager_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.document_version > old.document_version then
    update public.documents_acceptation
      set statut = 'obsolete_par_nouvelle_version', updated_at = now()
      where devis_id = new.id
        and statut in ('a_verifier', 'valide', 'regularisation_demandee');

    insert into public.evenements_dossier
      (client_id, demande_id, devis_id, devis_version, type, acteur, donnees)
    values (new.client_id, new.demande_id, new.id, new.document_version,
      'quote_version_created', 'operateur',
      jsonb_build_object('montant_total_ht', new.montant_total_ht,
                         'version_precedente', old.document_version));

    if new.client_id is not null then
      insert into public.messages_affaire
        (client_id, demande_id, devis_id, auteur, type, contenu)
      values (new.client_id, new.demande_id, new.id, 'tvm38', 'systeme',
        'Le devis ' || coalesce(nullif(new.numero_devis, ''), new.id)
        || ' a été mis à jour (version ' || new.document_version
        || '). Tout document d acceptation transmis pour la version précédente '
        || 'ne peut plus être utilisé : merci de consulter la nouvelle version '
        || 'avant de nous retourner votre accord.');
    end if;
  end if;

  -- Un nouveau devis envoyé sur une demande rend les précédents non
  -- actionnables. Sans ça, deux devis restent ouverts côté client et gonflent
  -- indéfiniment le compteur des devis en attente de réponse.
  if new.etat = 'envoye' and old.etat is distinct from 'envoye'
     and new.demande_id is not null then
    update public.devis
      set etat = 'archive', remplace_par_devis_id = new.id
      where demande_id = new.demande_id
        and id <> new.id
        and etat = 'envoye';

    update public.documents_acceptation
      set statut = 'obsolete_par_nouvelle_version', updated_at = now()
      where devis_id in (
        select id from public.devis
        where demande_id = new.demande_id and id <> new.id and etat = 'archive'
      )
      and statut in ('a_verifier', 'valide', 'regularisation_demandee');
  end if;

  return null;
end;
$$;

drop trigger if exists devis_propager_version_trg on public.devis;
create trigger devis_propager_version_trg
  after update on public.devis
  for each row execute function public.devis_propager_version();

-- ---------------------------------------------------------------------------
-- 7. Enregistrement transactionnel d'un dépôt
-- ---------------------------------------------------------------------------
-- Le fichier est déjà sur le Drive quand cette fonction est appelée. Tout ce
-- qui suit doit réussir ensemble ou pas du tout : marquer le document
-- précédent, insérer le nouveau, mettre à jour le devis, journaliser. Le
-- verrou sur la ligne devis ferme la fenêtre entre la vérification de version
-- et l'insertion — c'est là que se glisse une révision publiée pendant que le
-- client téléverse.

create or replace function public.enregistrer_document_acceptation(
  p_client_id text,
  p_devis_id text,
  p_devis_version integer,
  p_devis_pdf_sha256 text,
  p_type_document text,
  p_drive_file_id text,
  p_drive_folder_type text,
  p_nom_fichier_original text,
  p_nom_fichier_drive text,
  p_mime_type text,
  p_taille_octets bigint,
  p_sha256 text,
  p_nb_pages integer,
  p_converti boolean,
  p_reference_bc text,
  p_transmetteur_nom text,
  p_transmetteur_email text,
  p_transmetteur_fonction text,
  p_transmetteur_agence text,
  p_version_texte_confirmation text,
  p_commentaire_client text,
  p_adresse_ip text,
  p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_devis public.devis%rowtype;
  v_document_id uuid;
  v_remplaces integer := 0;
begin
  select * into v_devis from public.devis where id = p_devis_id for update;

  if not found or v_devis.client_id is distinct from p_client_id then
    raise exception 'AFFAIRE_NOT_FOUND';
  end if;
  if v_devis.etat <> 'envoye' then
    raise exception 'QUOTE_NOT_ACTIONABLE';
  end if;
  if v_devis.document_version is distinct from p_devis_version
     or v_devis.pdf_sha256 is distinct from p_devis_pdf_sha256 then
    raise exception 'QUOTE_VERSION_CHANGED';
  end if;
  if exists (
    select 1 from public.documents_acceptation
    where devis_id = p_devis_id and statut = 'valide'
  ) then
    raise exception 'ACCEPTANCE_ALREADY_VALIDATED';
  end if;

  -- Tant qu'un document n'a pas été contrôlé, le client peut le remplacer.
  -- L'ancien n'est jamais supprimé : il reste dans l'historique du dossier.
  update public.documents_acceptation
    set statut = 'remplace', updated_at = now()
    where devis_id = p_devis_id and statut in ('a_verifier', 'regularisation_demandee');
  get diagnostics v_remplaces = row_count;

  insert into public.documents_acceptation (
    client_id, demande_id, devis_id,
    devis_version, devis_numero, devis_pdf_sha256, devis_montant_ht,
    type_document, drive_file_id, drive_folder_type,
    nom_fichier_original, nom_fichier_drive, mime_type, taille_octets, sha256,
    nb_pages, converti_depuis_images, reference_bon_commande,
    transmetteur_nom, transmetteur_email, transmetteur_fonction, transmetteur_agence,
    confirmation_correspondance, confirmation_habilitation, version_texte_confirmation,
    commentaire_client, adresse_ip, user_agent
  ) values (
    p_client_id, v_devis.demande_id, p_devis_id,
    p_devis_version, coalesce(v_devis.numero_devis, ''), p_devis_pdf_sha256,
    coalesce(v_devis.montant_total_ht, 0),
    p_type_document, p_drive_file_id, p_drive_folder_type,
    p_nom_fichier_original, p_nom_fichier_drive, p_mime_type, p_taille_octets, p_sha256,
    p_nb_pages, coalesce(p_converti, false), nullif(p_reference_bc, ''),
    p_transmetteur_nom, nullif(p_transmetteur_email, ''), nullif(p_transmetteur_fonction, ''),
    nullif(p_transmetteur_agence, ''),
    true, true, p_version_texte_confirmation,
    nullif(p_commentaire_client, ''), nullif(p_adresse_ip, ''), nullif(p_user_agent, '')
  )
  returning id into v_document_id;

  update public.documents_acceptation
    set remplace_par_id = v_document_id
    where devis_id = p_devis_id and statut = 'remplace' and remplace_par_id is null;

  -- Le devis ne passe PAS à accepté : le dépôt vaut réception, le contrôle
  -- interne reste seul à pouvoir engager la carrière.
  update public.devis
    set acceptation_status = 'document_recu',
        document_acceptation_actif_id = v_document_id,
        acceptation_requested_at = now(),
        client_action = 'document_recu',
        client_action_at = now(),
        client_action_message = nullif(p_commentaire_client, ''),
        client_action_seen_at = null,
        client_action_seen_by = null,
        client_action_handled_at = null,
        client_action_handled_by = null,
        client_conversation_archived_at = null,
        client_conversation_archived_by = null
    where id = p_devis_id;

  insert into public.evenements_dossier
    (client_id, demande_id, devis_id, devis_version, document_id, type, acteur,
     acteur_id, acteur_nom, adresse_ip, user_agent, donnees)
  values (
    p_client_id, v_devis.demande_id, p_devis_id, p_devis_version, v_document_id,
    case when v_remplaces > 0 then 'acceptance_document_replaced'
         else 'acceptance_document_uploaded' end,
    'client', p_client_id, p_transmetteur_nom, nullif(p_adresse_ip, ''), nullif(p_user_agent, ''),
    jsonb_build_object(
      'type_document', p_type_document,
      'reference_bon_commande', nullif(p_reference_bc, ''),
      'sha256', p_sha256,
      'taille_octets', p_taille_octets,
      'documents_remplaces', v_remplaces
    )
  );

  insert into public.messages_affaire
    (client_id, demande_id, devis_id, auteur, type, contenu, lu_par_client_at)
  values (
    p_client_id, v_devis.demande_id, p_devis_id, 'client', 'systeme',
    case when p_type_document = 'bon_commande'
      then 'Bon de commande transmis' || coalesce(' (réf. ' || nullif(p_reference_bc, '') || ')', '')
        || ' pour le devis ' || coalesce(nullif(v_devis.numero_devis, ''), p_devis_id)
        || ' version ' || p_devis_version || ', par ' || p_transmetteur_nom
        || '. En attente de vérification par TVM38.'
      else 'Devis signé transmis pour le devis '
        || coalesce(nullif(v_devis.numero_devis, ''), p_devis_id)
        || ' version ' || p_devis_version || ', par ' || p_transmetteur_nom
        || '. En attente de vérification par TVM38.'
    end,
    now()
  );

  return jsonb_build_object(
    'documentId', v_document_id,
    'statut', 'a_verifier',
    'documentsRemplaces', v_remplaces,
    'devisVersion', p_devis_version
  );
end;
$$;

revoke all on function public.enregistrer_document_acceptation from public, anon, authenticated;
grant execute on function public.enregistrer_document_acceptation to service_role;

-- ---------------------------------------------------------------------------
-- 8. Droits
-- ---------------------------------------------------------------------------
-- Le navigateur du client n'accède jamais à ces tables : tout passe par les
-- Edge Functions, qui vérifient son JWT dédié avant d'utiliser service_role.
-- Le logiciel interne lit et contrôle avec son jeton opérateur.

alter table public.devis_versions enable row level security;
alter table public.documents_acceptation enable row level security;
alter table public.evenements_dossier enable row level security;

revoke all on public.devis_versions from anon, authenticated;
revoke all on public.documents_acceptation from anon, authenticated;
revoke all on public.evenements_dossier from anon, authenticated;

grant all on public.devis_versions to service_role;
grant all on public.documents_acceptation to service_role;
grant all on public.evenements_dossier to service_role;

grant select on public.devis_versions to authenticated;
grant select, update on public.documents_acceptation to authenticated;
grant select, insert on public.evenements_dossier to authenticated;

drop policy if exists devis_versions_operateur on public.devis_versions;
create policy devis_versions_operateur on public.devis_versions
  for select to authenticated using (true);

drop policy if exists documents_acceptation_operateur_lecture on public.documents_acceptation;
create policy documents_acceptation_operateur_lecture on public.documents_acceptation
  for select to authenticated using (true);

-- Le contrôle interne modifie le statut d'un document, jamais son contenu ni
-- son rattachement : un justificatif réaffectable à un autre devis ne prouve
-- plus rien.
drop policy if exists documents_acceptation_operateur_controle on public.documents_acceptation;
create policy documents_acceptation_operateur_controle on public.documents_acceptation
  for update to authenticated using (true) with check (true);

drop policy if exists evenements_dossier_operateur on public.evenements_dossier;
create policy evenements_dossier_operateur on public.evenements_dossier
  for select to authenticated using (true);
drop policy if exists evenements_dossier_operateur_insert on public.evenements_dossier;
create policy evenements_dossier_operateur_insert on public.evenements_dossier
  for insert to authenticated with check (true);

comment on table public.documents_acceptation is
  'Justificatifs d acceptation transmis par les clients. Table en ajout seul : un document n est jamais supprimé ni réaffecté, seul son statut évolue.';
comment on table public.evenements_dossier is
  'Chronologie des décisions d un dossier. Ne trace ni les consultations ni les téléchargements.';
