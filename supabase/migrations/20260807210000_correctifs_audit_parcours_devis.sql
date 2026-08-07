-- Correctifs issus de l'audit du parcours devis (défauts F, I, J).
--
-- Cette migration ne touche aucun montant, aucun numéro de devis et aucune
-- quantité : ces valeurs sont parties chez les clients, elles sont figées.
-- Seuls changent le corps de trois fonctions et le texte de six messages
-- système déjà écrits.
--
-- Rappel de contexte : les définitions de référence sont celles de la base,
-- pas celles de 20260805200000_documents_acceptation.sql, qui a été dépassé
-- par six migrations appliquées directement (jusqu'à plusieurs_justificatifs
-- _valides_v2). Les corps ci-dessous repartent du live.

-- ---------------------------------------------------------------------------
-- F. L'archivage d'un devis frère ne laissait aucune trace
-- ---------------------------------------------------------------------------
-- Ce qui manquait : le devis archivé gardait `acceptation_status = 'valide'`,
-- et ni évènement ni message n'étaient produits. Le type `quote_superseded`
-- existait dans la contrainte CHECK sans que rien ne l'écrive jamais.
--
-- Ce qui ne change pas, volontairement : seuls les frères à l'état `envoye`
-- sont archivés. Un devis déjà accepté est un engagement pris ; le logiciel
-- n'a pas à l'annuler tout seul. Le cas est traité en amont, par un
-- avertissement au moment de l'envoi.

create or replace function public.devis_propager_version()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_frere record;
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
        || '). Tout document d''acceptation transmis pour la version précédente '
        || 'ne peut plus être utilisé : merci de consulter la nouvelle version '
        || 'avant de nous retourner votre accord.');
    end if;
  end if;

  -- Un nouveau devis envoyé sur une demande rend les précédents non
  -- actionnables. Sans ça, deux devis restent ouverts côté client et gonflent
  -- indéfiniment le compteur des devis en attente de réponse.
  --
  -- La boucle remplace l'ancien UPDATE en masse : il faut un évènement et un
  -- message par devis remplacé, sinon l'archivage est muet pour le client
  -- comme pour l'opérateur.
  --
  -- Pas de récursion : les frères passent à `archive`, or cette branche exige
  -- `new.etat = 'envoye'`. Et aucune des colonnes écrites ici n'entre dans le
  -- test de changement visible du trigger BEFORE, donc pas de bump de version.
  if new.etat = 'envoye' and old.etat is distinct from 'envoye'
     and new.demande_id is not null then

    for v_frere in
      select id, client_id, numero_devis, document_version, acceptation_status
        from public.devis
       where demande_id = new.demande_id
         and id <> new.id
         and etat = 'envoye'
       for update
    loop
      update public.devis
        set etat = 'archive',
            remplace_par_devis_id = new.id,
            acceptation_status = case
              when acceptation_status <> 'none' then 'obsolete'
              else acceptation_status end,
            document_acceptation_actif_id = null
        where id = v_frere.id;

      update public.documents_acceptation
        set statut = 'obsolete_par_nouvelle_version', updated_at = now()
        where devis_id = v_frere.id
          and statut in ('a_verifier', 'valide', 'regularisation_demandee');

      insert into public.evenements_dossier
        (client_id, demande_id, devis_id, devis_version, type, acteur, donnees)
      values (v_frere.client_id, new.demande_id, v_frere.id,
        v_frere.document_version, 'quote_superseded', 'operateur',
        jsonb_build_object('remplace_par_devis_id', new.id,
                           'remplace_par_numero', nullif(new.numero_devis, ''),
                           'acceptation_precedente', v_frere.acceptation_status));

      if v_frere.client_id is not null then
        insert into public.messages_affaire
          (client_id, demande_id, devis_id, auteur, type, contenu)
        values (v_frere.client_id, new.demande_id, v_frere.id, 'tvm38', 'systeme',
          'Le devis ' || coalesce(nullif(v_frere.numero_devis, ''), v_frere.id)
          || ' est remplacé par le devis '
          || coalesce(nullif(new.numero_devis, ''), new.id)
          || ' et n''est plus valable. Tout document transmis pour ce devis '
          || 'ne peut plus être utilisé : merci de vous reporter au nouveau devis.');
      end if;
    end loop;
  end if;

  return null;
end $function$;

-- ---------------------------------------------------------------------------
-- J. « Ce document a déjà été contrôlé » là où le devis avait été republié
-- ---------------------------------------------------------------------------
-- Le trigger de propagation marque le document `obsolete_par_nouvelle_version`
-- avant que l'opérateur puisse agir. Le contrôle de statut passant en premier,
-- la sortie était toujours DOCUMENT_DEJA_TRAITE et VERSION_OBSOLETE restait
-- inatteignable — l'opérateur lisait un diagnostic faux.
--
-- I. Les textes repassent en français accentué : ils s'affichent dans le fil
-- du client, à côté de messages humains correctement écrits.

create or replace function public.controler_document_acceptation(
  p_document_id uuid,
  p_decision text,
  p_commentaire text,
  p_operateur_id text,
  p_operateur_nom text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_doc public.documents_acceptation%rowtype;
  v_devis public.devis%rowtype;
  v_statut text;
  v_message text;
  v_evenement text;
begin
  if p_decision not in ('valide', 'regularisation_demandee', 'rejete') then
    raise exception 'DECISION_INVALIDE';
  end if;

  -- Un motif est obligatoire dès lors qu'on renvoie la balle au client : sans
  -- lui, il ne sait pas quoi corriger et redépose la même chose.
  if p_decision in ('regularisation_demandee', 'rejete')
     and coalesce(length(trim(p_commentaire)), 0) < 5 then
    raise exception 'COMMENTAIRE_REQUIS';
  end if;

  select * into v_doc from public.documents_acceptation where id = p_document_id for update;
  if not found then raise exception 'DOCUMENT_INTROUVABLE'; end if;

  -- Ce test passe AVANT celui du statut générique. Un document rendu caduc par
  -- une republication n'a pas « déjà été contrôlé » : personne ne l'a regardé,
  -- c'est le devis qui a bougé sous lui. Les deux cas appellent des gestes
  -- différents, ils doivent porter des messages différents.
  if v_doc.statut = 'obsolete_par_nouvelle_version' then
    raise exception 'VERSION_OBSOLETE';
  end if;

  if v_doc.statut not in ('a_verifier', 'regularisation_demandee') then
    raise exception 'DOCUMENT_DEJA_TRAITE';
  end if;

  select * into v_devis from public.devis where id = v_doc.devis_id for update;
  if not found then raise exception 'DEVIS_INTROUVABLE'; end if;

  -- Filet : le document porte une version précise. Si le devis a été republié
  -- entre-temps sans que le trigger ait marqué le document, valider reviendrait
  -- à accepter une pièce qui ne correspond plus.
  if v_doc.devis_version is distinct from v_devis.document_version then
    raise exception 'VERSION_OBSOLETE';
  end if;

  v_statut := p_decision;

  update public.documents_acceptation
    set statut = v_statut,
        commentaire_controle = nullif(trim(p_commentaire), ''),
        controle_at = now(),
        controle_par_id = p_operateur_id,
        controle_par_nom = p_operateur_nom,
        updated_at = now()
    where id = p_document_id;

  if p_decision = 'valide' then
    update public.devis
      set etat = 'accepte',
          acceptation_status = 'valide',
          acceptation_validated_at = now(),
          acceptation_validated_by = p_operateur_nom,
          client_action_handled_at = now(),
          client_action_handled_by = p_operateur_nom,
          client_action_seen_at = coalesce(client_action_seen_at, now()),
          client_action_seen_by = coalesce(client_action_seen_by, p_operateur_nom)
      where id = v_devis.id;
    v_evenement := 'acceptance_validated';
    v_message := 'Votre acceptation du devis '
      || coalesce(nullif(v_devis.numero_devis, ''), v_devis.id)
      || ' a été vérifiée et validée par TVM38. Le devis est désormais accepté.';
  elsif p_decision = 'regularisation_demandee' then
    update public.devis
      set acceptation_status = 'regularisation_demandee',
          client_action_handled_at = now(),
          client_action_handled_by = p_operateur_nom,
          client_action_seen_at = coalesce(client_action_seen_at, now()),
          client_action_seen_by = coalesce(client_action_seen_by, p_operateur_nom)
      where id = v_devis.id;
    v_evenement := 'acceptance_regularization_requested';
    v_message := 'Le document transmis pour le devis '
      || coalesce(nullif(v_devis.numero_devis, ''), v_devis.id)
      || ' doit être corrigé. Motif : ' || trim(p_commentaire)
      || '. Merci de nous en transmettre un nouveau depuis votre espace client.';
  else
    update public.devis
      set acceptation_status = 'rejete',
          document_acceptation_actif_id = null,
          client_action = null,
          client_action_at = null,
          client_action_message = null,
          client_action_handled_at = now(),
          client_action_handled_by = p_operateur_nom
      where id = v_devis.id;
    v_evenement := 'acceptance_rejected';
    v_message := 'Le document transmis pour le devis '
      || coalesce(nullif(v_devis.numero_devis, ''), v_devis.id)
      || ' n''a pas pu être accepté. Motif : ' || trim(p_commentaire)
      || '. Merci de nous en transmettre un nouveau depuis votre espace client.';
  end if;

  insert into public.evenements_dossier
    (client_id, demande_id, devis_id, devis_version, document_id, type, acteur,
     acteur_id, acteur_nom, donnees)
  values (v_doc.client_id, v_devis.demande_id, v_devis.id, v_doc.devis_version, p_document_id,
    v_evenement, 'operateur', p_operateur_id, p_operateur_nom,
    jsonb_build_object('commentaire', nullif(trim(p_commentaire), ''),
                       'type_document', v_doc.type_document));

  insert into public.messages_affaire
    (client_id, demande_id, devis_id, auteur, type, contenu, lu_par_tvm38_at, traite_par_tvm38_at, traite_par_tvm38_by)
  values (v_doc.client_id, v_devis.demande_id, v_devis.id, 'tvm38', 'systeme',
    v_message, now(), now(), p_operateur_nom);

  -- Les messages du client sur ce devis sont traités par la décision elle-même.
  update public.messages_affaire
    set traite_par_tvm38_at = now(), traite_par_tvm38_by = p_operateur_nom
    where devis_id = v_devis.id and auteur = 'client' and traite_par_tvm38_at is null;

  return jsonb_build_object('documentId', p_document_id, 'statut', v_statut,
    'devisEtat', case when p_decision = 'valide' then 'accepte' else v_devis.etat end);
end;
$function$;

-- ---------------------------------------------------------------------------
-- I. Accents — dépôt par le client
-- ---------------------------------------------------------------------------
-- Corps identique au live, seuls les libellés changent.

create or replace function public.enregistrer_document_acceptation(
  p_client_id text, p_devis_id text, p_devis_version integer, p_devis_pdf_sha256 text,
  p_type_document text, p_drive_file_id text, p_drive_folder_type text,
  p_nom_fichier_original text, p_nom_fichier_drive text, p_mime_type text,
  p_taille_octets bigint, p_sha256 text, p_nb_pages integer, p_converti boolean,
  p_reference_bc text, p_transmetteur_nom text, p_transmetteur_email text,
  p_transmetteur_fonction text, p_transmetteur_agence text,
  p_version_texte_confirmation text, p_commentaire_client text,
  p_adresse_ip text, p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_devis public.devis%rowtype; v_document_id uuid; v_remplaces integer := 0;
begin
  select * into v_devis from public.devis where id = p_devis_id for update;
  if not found or v_devis.client_id is distinct from p_client_id then raise exception 'AFFAIRE_NOT_FOUND'; end if;
  if v_devis.etat <> 'envoye' then raise exception 'QUOTE_NOT_ACTIONABLE'; end if;
  if v_devis.document_version is distinct from p_devis_version
     or v_devis.pdf_sha256 is distinct from p_devis_pdf_sha256 then raise exception 'QUOTE_VERSION_CHANGED'; end if;
  if exists (select 1 from public.documents_acceptation where devis_id=p_devis_id and statut='valide')
    then raise exception 'ACCEPTANCE_ALREADY_VALIDATED'; end if;

  update public.documents_acceptation set statut='remplace', updated_at=now()
    where devis_id=p_devis_id and statut in ('a_verifier','regularisation_demandee');
  get diagnostics v_remplaces = row_count;

  insert into public.documents_acceptation (
    client_id, demande_id, devis_id, devis_version, devis_numero, devis_pdf_sha256, devis_montant_ht,
    type_document, drive_file_id, drive_folder_type, nom_fichier_original, nom_fichier_drive,
    mime_type, taille_octets, sha256, nb_pages, converti_depuis_images, reference_bon_commande,
    transmetteur_nom, transmetteur_email, transmetteur_fonction, transmetteur_agence,
    confirmation_correspondance, confirmation_habilitation, version_texte_confirmation,
    commentaire_client, adresse_ip, user_agent)
  values (
    p_client_id, v_devis.demande_id, p_devis_id, p_devis_version, coalesce(v_devis.numero_devis,''),
    p_devis_pdf_sha256, coalesce(v_devis.montant_total_ht,0), p_type_document, p_drive_file_id,
    p_drive_folder_type, p_nom_fichier_original, p_nom_fichier_drive, p_mime_type, p_taille_octets,
    p_sha256, p_nb_pages, coalesce(p_converti,false), nullif(p_reference_bc,''), p_transmetteur_nom,
    nullif(p_transmetteur_email,''), nullif(p_transmetteur_fonction,''), nullif(p_transmetteur_agence,''),
    true, true, p_version_texte_confirmation, nullif(p_commentaire_client,''),
    nullif(p_adresse_ip,''), nullif(p_user_agent,''))
  returning id into v_document_id;

  update public.documents_acceptation set remplace_par_id=v_document_id
    where devis_id=p_devis_id and statut='remplace' and remplace_par_id is null;

  update public.devis set acceptation_status='document_recu', document_acceptation_actif_id=v_document_id,
    acceptation_requested_at=now(), client_action='document_recu', client_action_at=now(),
    client_action_message=nullif(p_commentaire_client,''), client_action_seen_at=null,
    client_action_seen_by=null, client_action_handled_at=null, client_action_handled_by=null,
    client_conversation_archived_at=null, client_conversation_archived_by=null
    where id=p_devis_id;

  insert into public.evenements_dossier (client_id, demande_id, devis_id, devis_version, document_id,
    type, acteur, acteur_id, acteur_nom, adresse_ip, user_agent, donnees)
  values (p_client_id, v_devis.demande_id, p_devis_id, p_devis_version, v_document_id,
    case when v_remplaces > 0 then 'acceptance_document_replaced' else 'acceptance_document_uploaded' end,
    'client', p_client_id, p_transmetteur_nom, nullif(p_adresse_ip,''), nullif(p_user_agent,''),
    jsonb_build_object('type_document', p_type_document, 'reference_bon_commande', nullif(p_reference_bc,''),
      'sha256', p_sha256, 'taille_octets', p_taille_octets, 'documents_remplaces', v_remplaces));

  insert into public.messages_affaire (client_id, demande_id, devis_id, auteur, type, contenu, lu_par_client_at)
  values (p_client_id, v_devis.demande_id, p_devis_id, 'client', 'systeme',
    case when p_type_document = 'bon_commande'
      then 'Bon de commande transmis'||coalesce(' (réf. '||nullif(p_reference_bc,'')||')','')||
        ' pour le devis '||coalesce(nullif(v_devis.numero_devis,''),p_devis_id)||' version '||p_devis_version||
        ', par '||p_transmetteur_nom||'. En attente de vérification par TVM38.'
      else 'Devis signé transmis pour le devis '||coalesce(nullif(v_devis.numero_devis,''),p_devis_id)||
        ' version '||p_devis_version||', par '||p_transmetteur_nom||'. En attente de vérification par TVM38.'
    end, now());

  return jsonb_build_object('documentId', v_document_id, 'statut', 'a_verifier',
    'documentsRemplaces', v_remplaces, 'devisVersion', p_devis_version);
end $function$;

-- ---------------------------------------------------------------------------
-- I. Accents — dépôt par l'opérateur
-- ---------------------------------------------------------------------------
-- `devis_pdf_sha256` reste vide quand le devis n'a pas d'empreinte connue : sur
-- un dépôt opérateur, la pièce arrive par courrier et c'est l'opérateur qui
-- certifie. Une chaîne vide dit honnêtement « aucune empreinte au moment du
-- dépôt » ; y mettre une valeur calculée après coup laisserait croire à un
-- rattachement qui n'a pas eu lieu.

create or replace function public.deposer_document_operateur(
  p_devis_id text, p_type_document text, p_drive_file_id text, p_drive_folder_type text,
  p_nom_fichier_original text, p_nom_fichier_drive text, p_taille_octets bigint,
  p_sha256 text, p_nb_pages integer, p_reference_bc text, p_commentaire text,
  p_operateur_id text, p_operateur_nom text, p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_devis public.devis%rowtype;
  v_document_id uuid;
  v_remplaces integer := 0;
  v_accepte boolean;
  v_mode text := coalesce(nullif(p_mode, ''), 'remplacer');
begin
  if p_type_document not in ('devis_signe', 'bon_commande') then
    raise exception 'TYPE_INVALIDE';
  end if;
  if v_mode not in ('ajouter', 'remplacer') then
    raise exception 'MODE_INVALIDE';
  end if;

  select * into v_devis from public.devis where id = p_devis_id for update;
  if not found then raise exception 'DEVIS_INTROUVABLE'; end if;
  if v_devis.etat not in ('envoye', 'accepte', 'planifie', 'termine') then
    raise exception 'ETAT_NON_ELIGIBLE';
  end if;
  if v_devis.client_id is null then raise exception 'DEVIS_SANS_CLIENT'; end if;

  v_accepte := v_devis.etat = 'envoye';

  -- Un document en attente de contrôle est toujours écarté : il ne peut y en
  -- avoir qu'un, et celui qu'on verse le rend caduc. Les pièces déjà validées
  -- ne partent que si l'opérateur a demandé un remplacement.
  update public.documents_acceptation
    set statut = 'remplace', updated_at = now()
    where devis_id = p_devis_id
      and (statut in ('a_verifier', 'regularisation_demandee')
           or (v_mode = 'remplacer' and statut = 'valide'));
  get diagnostics v_remplaces = row_count;

  insert into public.documents_acceptation (
    client_id, demande_id, devis_id, devis_version, devis_numero, devis_pdf_sha256,
    devis_montant_ht, type_document, drive_file_id, drive_folder_type,
    nom_fichier_original, nom_fichier_drive, mime_type, taille_octets, sha256, nb_pages,
    reference_bon_commande, transmetteur_nom, confirmation_correspondance,
    confirmation_habilitation, version_texte_confirmation, commentaire_client,
    statut, origine, controle_at, controle_par_id, controle_par_nom
  ) values (
    v_devis.client_id, v_devis.demande_id, p_devis_id, coalesce(v_devis.document_version, 1),
    coalesce(v_devis.numero_devis, ''), coalesce(v_devis.pdf_sha256, ''),
    coalesce(v_devis.montant_total_ht, 0), p_type_document, p_drive_file_id, p_drive_folder_type,
    p_nom_fichier_original, p_nom_fichier_drive, 'application/pdf', p_taille_octets, p_sha256,
    p_nb_pages, nullif(p_reference_bc, ''), p_operateur_nom, true, true, 'operateur',
    nullif(trim(p_commentaire), ''), 'valide', 'operateur', now(), p_operateur_id, p_operateur_nom
  )
  returning id into v_document_id;

  update public.documents_acceptation
    set remplace_par_id = v_document_id
    where devis_id = p_devis_id and statut = 'remplace' and remplace_par_id is null;

  update public.devis
    set etat = case when v_accepte then 'accepte' else etat end,
        acceptation_status = 'valide',
        document_acceptation_actif_id = v_document_id,
        acceptation_validated_at = now(),
        acceptation_validated_by = p_operateur_nom,
        client_action = null,
        client_action_at = null,
        client_action_message = null,
        client_action_handled_at = now(),
        client_action_handled_by = p_operateur_nom
    where id = p_devis_id;

  insert into public.evenements_dossier
    (client_id, demande_id, devis_id, devis_version, document_id, type, acteur,
     acteur_id, acteur_nom, donnees)
  values (
    v_devis.client_id, v_devis.demande_id, p_devis_id, coalesce(v_devis.document_version, 1),
    v_document_id, 'acceptance_validated', 'operateur', p_operateur_id, p_operateur_nom,
    jsonb_build_object('origine', 'operateur', 'type_document', p_type_document,
                       'reference_bon_commande', nullif(p_reference_bc, ''),
                       'devis_accepte', v_accepte, 'mode', v_mode,
                       'documents_remplaces', v_remplaces)
  );

  insert into public.messages_affaire
    (client_id, demande_id, devis_id, auteur, type, contenu,
     lu_par_tvm38_at, traite_par_tvm38_at, traite_par_tvm38_by)
  values (
    v_devis.client_id, v_devis.demande_id, p_devis_id, 'tvm38', 'systeme',
    case when p_type_document = 'bon_commande'
      then 'Bon de commande' || coalesce(' ' || nullif(p_reference_bc, ''), '')
        || ' reçu par TVM38 et enregistré au dossier'
        || case when v_accepte then '. Votre commande est confirmée.' else '.' end
      else 'Devis signé reçu par TVM38 et enregistré au dossier'
        || case when v_accepte then '. Votre commande est confirmée.' else '.' end
    end,
    now(), now(), p_operateur_nom
  );

  return jsonb_build_object(
    'documentId', v_document_id,
    'devisAccepte', v_accepte,
    'documentsRemplaces', v_remplaces
  );
end;
$function$;
