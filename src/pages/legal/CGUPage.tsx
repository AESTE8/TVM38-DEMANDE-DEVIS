import { Link } from 'react-router-dom';
import LegalLayout, { LegalSection } from '@/components/layout/LegalLayout';
import { ENTREPRISE } from '@/data/entreprise';

export default function CGUPage() {
  return (
    <LegalLayout titre="Conditions générales d'utilisation">
      <LegalSection titre="Objet">
        <p>
          Les présentes conditions régissent l'utilisation du portail de demande de devis de
          {' '}{ENTREPRISE.nomCommercial}, édité par {ENTREPRISE.denomination}. Utiliser le site
          vaut acceptation de ces conditions. Si vous ne les acceptez pas, n'utilisez pas le service.
        </p>
      </LegalSection>

      <LegalSection titre="Service proposé">
        <p>Le site permet de :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>déposer une demande de devis pour la fourniture, la livraison de granulats ou la mise en décharge de déblais ;</li>
          <li>suivre ses affaires et ses devis depuis un espace personnel, pour les clients disposant d'identifiants ;</li>
          <li>transmettre à {ENTREPRISE.nomCommercial} un avis sur la prestation réalisée.</li>
        </ul>
        <p>
          Le site ne propose ni vente en ligne, ni paiement, ni réservation de créneau ferme.
        </p>
      </LegalSection>

      <LegalSection titre="Portée d'une demande">
        <p>
          Une demande déposée sur le site est une <span className="font-semibold">sollicitation
          commerciale</span>, non une commande. Elle n'engage {ENTREPRISE.nomCommercial} ni sur le
          prix, ni sur les quantités, ni sur les délais. Les matériaux, capacités de camions et
          disponibilités affichés sont indicatifs. Seul le devis établi par
          {' '}{ENTREPRISE.nomCommercial}, puis accepté par le client, forme le contrat.
        </p>
      </LegalSection>

      <LegalSection titre="Accès au service">
        <p>
          Le formulaire de devis est ouvert aux professionnels comme aux particuliers, avec ou sans
          identifiants. L'espace personnel est réservé aux clients à qui
          {' '}{ENTREPRISE.nomCommercial} a communiqué un identifiant et un mot de passe.
        </p>
        <p>
          Le service est accessible en continu, hors interruptions liées à la maintenance, à une
          panne ou à un cas de force majeure. {ENTREPRISE.nomCommercial} ne garantit aucune
          disponibilité chiffrée et peut faire évoluer ou suspendre le service.
        </p>
      </LegalSection>

      <LegalSection titre="Identifiants">
        <p>
          Vos identifiants sont personnels et confidentiels. Vous êtes responsable de leur
          conservation et des actions réalisées depuis votre compte. En cas de perte, de vol ou de
          soupçon d'utilisation par un tiers, prévenez {ENTREPRISE.nomCommercial} sans délai à{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${ENTREPRISE.email}`}>
            {ENTREPRISE.email}
          </a>{' '}
          ou via la page de récupération d'identifiants.
        </p>
      </LegalSection>

      <LegalSection titre="Engagements de l'utilisateur">
        <p>Vous vous engagez à :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>fournir des informations exactes, notamment les coordonnées, l'adresse de livraison et les quantités ;</li>
          <li>n'utiliser le site que pour des demandes réelles, à l'exclusion de tout envoi massif ou automatisé ;</li>
          <li>ne pas tenter d'accéder à des comptes ou à des données qui ne vous appartiennent pas ;</li>
          <li>ne pas perturber le fonctionnement du service ni contourner ses mesures de sécurité ;</li>
          <li>ne transmettre aucun contenu illicite, injurieux ou portant atteinte aux droits d'autrui.</li>
        </ul>
        <p>
          {ENTREPRISE.nomCommercial} peut suspendre l'accès d'un compte en cas de manquement à ces
          engagements.
        </p>
      </LegalSection>

      <LegalSection titre="Avis clients">
        <p>
          Les avis transmis depuis le site sont adressés directement à {ENTREPRISE.nomCommercial} et
          ne sont pas publiés sur le site. Vous restez libre de publier un avis sur une plateforme
          externe, selon les règles propres à celle-ci.
        </p>
      </LegalSection>

      <LegalSection titre="Documents transmis">
        <p>
          Les justificatifs que vous déposez depuis l'espace personnel doivent vous appartenir ou
          vous autoriser à les transmettre. Ils sont conservés au titre des obligations comptables
          de {ENTREPRISE.nomCommercial} et de la traçabilité des acceptations de devis, dans les
          conditions décrites par la{' '}
          <Link className="font-semibold text-primary hover:underline" to="/confidentialite">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection titre="Propriété intellectuelle">
        <p>
          Le site, sa structure et ses contenus sont protégés. Aucune reproduction ou réutilisation
          n'est autorisée sans accord écrit préalable de {ENTREPRISE.denomination}.
        </p>
      </LegalSection>

      <LegalSection titre="Responsabilité">
        <p>
          {ENTREPRISE.nomCommercial} met en œuvre les moyens raisonnables pour assurer l'exactitude
          des informations et la disponibilité du service, sans garantie d'absence d'erreur ou
          d'interruption. Sa responsabilité ne saurait être engagée pour les conséquences d'une
          information erronée saisie par l'utilisateur, d'une indisponibilité du réseau, ou de
          l'usage d'un site tiers accessible par lien.
        </p>
      </LegalSection>

      <LegalSection titre="Données personnelles">
        <p>
          Le traitement de vos données est détaillé dans la{' '}
          <Link className="font-semibold text-primary hover:underline" to="/confidentialite">
            politique de confidentialité
          </Link>
          . Les informations relatives à l'éditeur figurent dans les{' '}
          <Link className="font-semibold text-primary hover:underline" to="/mentions-legales">
            mentions légales
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection titre="Évolution et droit applicable">
        <p>
          Ces conditions peuvent être modifiées ; la version applicable est celle en ligne au moment
          de votre utilisation. Elles sont soumises au droit français. En cas de litige, une
          solution amiable sera recherchée avant toute action ; à défaut, les tribunaux français
          sont compétents.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
