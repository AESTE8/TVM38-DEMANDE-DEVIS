import { Link } from 'react-router-dom';
import LegalLayout, { LegalSection, LegalLigne } from '@/components/layout/LegalLayout';
import { ENTREPRISE, HEBERGEUR } from '@/data/entreprise';

export default function MentionsLegalesPage() {
  return (
    <LegalLayout titre="Mentions légales">
      <LegalSection titre="Éditeur du site">
        <LegalLigne label="Dénomination sociale">{ENTREPRISE.denomination}</LegalLigne>
        <LegalLigne label="Nom commercial">{ENTREPRISE.nomCommercial}</LegalLigne>
        <LegalLigne label="Forme juridique">{ENTREPRISE.formeJuridique}</LegalLigne>
        <LegalLigne label="Capital social">{ENTREPRISE.capitalSocial}</LegalLigne>
        <LegalLigne label="Siège social">{ENTREPRISE.siegeSocial}</LegalLigne>
        <LegalLigne label="Établissement TVM38">{ENTREPRISE.etablissement}</LegalLigne>
        <LegalLigne label="SIREN">{ENTREPRISE.siren}</LegalLigne>
        <LegalLigne label="SIRET de l'établissement">{ENTREPRISE.siretEtablissement}</LegalLigne>
        <LegalLigne label="RCS">{ENTREPRISE.rcs}</LegalLigne>
        <LegalLigne label="Numéro de TVA intracommunautaire">{ENTREPRISE.tvaIntracommunautaire}</LegalLigne>
        <LegalLigne label="Code NAF">{ENTREPRISE.codeNaf}</LegalLigne>
        <LegalLigne label="Directeur de la publication">{ENTREPRISE.directeurPublication}</LegalLigne>
        <LegalLigne label="Téléphone">
          <a className="text-primary hover:underline" href={ENTREPRISE.telephoneLien}>{ENTREPRISE.telephone}</a>
        </LegalLigne>
        <LegalLigne label="Courriel">
          <a className="text-primary hover:underline" href={`mailto:${ENTREPRISE.email}`}>{ENTREPRISE.email}</a>
        </LegalLigne>
      </LegalSection>

      <LegalSection titre="Hébergement">
        <p>Le site est hébergé par :</p>
        <LegalLigne label="Hébergeur">{HEBERGEUR.nom}</LegalLigne>
        <LegalLigne label="Adresse">{HEBERGEUR.adresse}</LegalLigne>
        <LegalLigne label="Site">
          <a className="text-primary hover:underline" href={HEBERGEUR.contact} target="_blank" rel="noopener noreferrer">
            {HEBERGEUR.contact}
          </a>
        </LegalLigne>
        <p className="pt-2">
          Les données saisies sur le site sont enregistrées et traitées par {HEBERGEUR.baseDeDonnees},
          sur une infrastructure située dans l'{HEBERGEUR.baseDeDonneesRegion}.
        </p>
      </LegalSection>

      <LegalSection titre="Objet du site">
        <p>
          Ce site permet aux clients et prospects de {ENTREPRISE.nomCommercial} de déposer une demande
          de devis pour la fourniture, la livraison de granulats et la mise en décharge de déblais,
          de suivre leurs affaires depuis un espace personnel et de transmettre un avis sur la
          prestation. Il ne permet ni la vente en ligne ni le paiement.
        </p>
      </LegalSection>

      <LegalSection titre="Propriété intellectuelle">
        <p>
          L'ensemble des contenus du site — structure, textes, identité visuelle, logos, photographies
          et éléments graphiques — est la propriété de {ENTREPRISE.denomination} ou fait l'objet d'une
          autorisation d'usage. Toute reproduction, représentation ou adaptation, totale ou partielle,
          sans autorisation écrite préalable est interdite.
        </p>
      </LegalSection>

      <LegalSection titre="Données personnelles">
        <p>
          Les traitements de données personnelles opérés depuis ce site sont décrits dans la{' '}
          <Link className="font-semibold text-primary hover:underline" to="/confidentialite">
            politique de confidentialité
          </Link>
          , qui précise les finalités, les bases légales, les destinataires, les durées de conservation
          et les modalités d'exercice de vos droits.
        </p>
      </LegalSection>

      <LegalSection titre="Responsabilité">
        <p>
          {ENTREPRISE.nomCommercial} s'efforce d'assurer l'exactitude des informations publiées. Les
          matériaux, capacités de camions et disponibilités présentés sur le site sont donnés à titre
          indicatif : seul le devis établi par {ENTREPRISE.nomCommercial} et accepté par le client a
          valeur d'engagement. Une demande déposée sur le site ne vaut ni commande ni réservation.
        </p>
      </LegalSection>

      <LegalSection titre="Liens sortants">
        <p>
          Le site renvoie vers des sites tiers, notamment celui de la société MIDALI et une page
          d'avis en ligne. {ENTREPRISE.denomination} n'exerce aucun contrôle sur leur contenu et
          décline toute responsabilité à leur égard.
        </p>
      </LegalSection>

      <LegalSection titre="Droit applicable">
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige et à défaut
          de résolution amiable, les tribunaux français sont seuls compétents.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
