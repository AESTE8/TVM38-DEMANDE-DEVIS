import { Link } from 'react-router-dom';
import LegalLayout, { LegalSection } from '@/components/layout/LegalLayout';
import { ENTREPRISE, HEBERGEUR } from '@/data/entreprise';

const TRAITEMENTS = [
  {
    finalite: 'Traiter une demande de devis et y répondre',
    donnees: "Nom, prénom, fonction, email, téléphone, entreprise, adresse de livraison, matériaux et quantités demandés, notes libres",
    base: "Mesures précontractuelles prises à votre demande (art. 6.1.b du RGPD)",
    duree: "3 ans à compter du dernier contact si la demande reste sans suite",
  },
  {
    finalite: "Gérer la relation client, les affaires et l'espace personnel",
    donnees: "Identifiants de connexion, coordonnées des contacts et agences, historique des demandes et devis, messages échangés",
    base: "Exécution du contrat (art. 6.1.b du RGPD)",
    duree: "Durée de la relation commerciale, puis 5 ans",
  },
  {
    finalite: "Conserver les justificatifs d'acceptation des devis et les pièces comptables",
    donnees: "Documents transmis par le client, devis, éléments de facturation",
    base: "Obligation légale (art. 6.1.c du RGPD ; art. L123-22 du code de commerce)",
    duree: '10 ans',
  },
  {
    finalite: "Répondre à une demande de récupération d'identifiants ou d'ouverture de compte",
    donnees: 'Nom, code client, email, téléphone, entreprise',
    base: "Mesures précontractuelles et exécution du contrat (art. 6.1.b du RGPD)",
    duree: "3 ans à compter du dernier contact",
  },
  {
    finalite: "Recueillir votre avis sur la prestation",
    donnees: 'Note, message, et si vous les renseignez : nom, email, téléphone',
    base: 'Votre consentement (art. 6.1.a du RGPD)',
    duree: '3 ans',
  },
  {
    finalite: "Assurer la sécurité du service et prévenir les abus",
    donnees: "Adresse IP au moment de l'envoi d'un message, journaux techniques",
    base: "Intérêt légitime à protéger le service (art. 6.1.f du RGPD)",
    duree: '12 mois',
  },
];

export default function ConfidentialitePage() {
  return (
    <LegalLayout titre="Politique de confidentialité">
      <LegalSection titre="Responsable de traitement">
        <p>
          Le responsable des traitements décrits ci-dessous est {ENTREPRISE.denomination}
          {' '}({ENTREPRISE.nomCommercial}), {ENTREPRISE.siegeSocial}, immatriculée sous le
          numéro SIREN {ENTREPRISE.siren}.
        </p>
        <p>
          Pour toute question relative à vos données, écrivez à{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${ENTREPRISE.email}`}>
            {ENTREPRISE.email}
          </a>{' '}
          ou par courrier à l'adresse : {ENTREPRISE.etablissement}.
        </p>
        <p>
          Aucun délégué à la protection des données n'a été désigné, sa désignation n'étant pas
          obligatoire au regard des traitements réalisés.
        </p>
      </LegalSection>

      <LegalSection titre="Traitements réalisés">
        <p>
          Les données que vous saisissez sur ce site ne sont utilisées que pour les finalités
          suivantes. Aucune donnée n'est vendue, louée ni utilisée à des fins publicitaires.
        </p>
        <div className="space-y-4">
          {TRAITEMENTS.map((t) => (
            <div key={t.finalite} className="rounded-xl border border-border bg-white p-4">
              <p className="font-headline text-sm font-bold text-on-surface">{t.finalite}</p>
              <dl className="mt-2 space-y-1 text-sm">
                <div>
                  <dt className="inline font-semibold text-secondary">Données : </dt>
                  <dd className="inline">{t.donnees}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-secondary">Base légale : </dt>
                  <dd className="inline">{t.base}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-secondary">Conservation : </dt>
                  <dd className="inline">{t.duree}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p>
          Un compte client resté inactif pendant 3 ans est supprimé ou anonymisé. Les données
          nécessaires au respect d'une obligation légale sont conservées jusqu'au terme du délai
          correspondant, puis effacées.
        </p>
      </LegalSection>

      <LegalSection titre="Caractère obligatoire des informations">
        <p>
          Les champs signalés comme obligatoires dans les formulaires sont nécessaires au traitement
          de votre demande : sans eux, {ENTREPRISE.nomCommercial} ne peut pas établir de devis ni vous
          recontacter. Les autres champs sont facultatifs.
        </p>
      </LegalSection>

      <LegalSection titre="Destinataires et sous-traitants">
        <p>
          Vos données sont accessibles aux équipes de {ENTREPRISE.nomCommercial} chargées du devis,
          de la logistique et de la facturation. Elles sont également traitées par les prestataires
          techniques suivants, agissant sur instruction et pour le seul compte de
          {' '}{ENTREPRISE.denomination} :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold">{HEBERGEUR.baseDeDonnees}</span> — base de données,
            traitements serveur et stockage des pièces jointes. Données hébergées dans
            l'{HEBERGEUR.baseDeDonneesRegion}.
          </li>
          <li>
            <span className="font-semibold">{HEBERGEUR.nom}</span> — hébergement et diffusion des
            pages du site.
          </li>
          <li>
            <span className="font-semibold">Google LLC</span> — stockage des devis au format PDF sur
            un espace Google Drive professionnel.
          </li>
          <li>
            <span className="font-semibold">Prestataire d'acheminement des courriels</span> —
            transmission des notifications et des devis par email.
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="Transferts hors Union européenne">
        <p>
          La base de données est hébergée dans l'Union européenne. En revanche, l'hébergement des
          pages du site, le stockage des devis PDF et l'acheminement des courriels font intervenir
          des sociétés établies aux États-Unis. Ces transferts sont encadrés par les clauses
          contractuelles types adoptées par la Commission européenne, intégrées aux conditions de
          traitement de ces prestataires.
        </p>
      </LegalSection>

      <LegalSection titre="Cookies et stockage local">
        <p>
          Ce site ne dépose <span className="font-semibold">aucun cookie</span> et n'utilise aucun
          outil de mesure d'audience ni de publicité. Les polices de caractères sont hébergées par le
          site lui-même : aucune requête n'est adressée à un serveur tiers lors de votre visite.
        </p>
        <p>Deux informations seulement sont enregistrées dans la mémoire de votre navigateur :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            votre <span className="font-semibold">session de connexion</span>, pour vous éviter de
            saisir vos identifiants à chaque page ;
          </li>
          <li>
            le <span className="font-semibold">brouillon de votre demande de devis</span>, pour ne
            pas perdre votre saisie en cas de fermeture accidentelle.
          </li>
        </ul>
        <p>
          Ces deux éléments sont strictement nécessaires au service que vous demandez et ne
          requièrent donc pas votre consentement. Ils restent sur votre appareil, ne sont transmis à
          personne, et disparaissent lorsque vous vous déconnectez ou effacez les données du site.
        </p>
      </LegalSection>

      <LegalSection titre="Sécurité">
        <p>
          Les échanges avec le site sont chiffrés (HTTPS). Les mots de passe ne sont jamais stockés
          en clair : ils sont transformés par une fonction de dérivation à clé (PBKDF2-SHA256,
          210 000 itérations). L'accès aux données en base est restreint par des politiques
          d'habilitation, et les identifiants techniques des prestataires ne sont jamais exposés dans
          le navigateur.
        </p>
      </LegalSection>

      <LegalSection titre="Vos droits">
        <p>
          Vous disposez d'un droit d'accès, de rectification, d'effacement et de limitation, d'un
          droit d'opposition au traitement fondé sur l'intérêt légitime, d'un droit à la portabilité
          des données que vous avez fournies, et du droit de définir des directives relatives au sort
          de vos données après votre décès. Lorsque le traitement repose sur votre consentement, vous
          pouvez le retirer à tout moment, sans que cela remette en cause ce qui a été fait avant.
        </p>
        <p>
          Pour exercer ces droits, écrivez à{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${ENTREPRISE.email}`}>
            {ENTREPRISE.email}
          </a>{' '}
          ou à {ENTREPRISE.etablissement}. Une réponse vous sera apportée dans un délai d'un mois.
          Une pièce d'identité pourra être demandée en cas de doute sérieux sur votre identité.
        </p>
        <p>
          Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous
          pouvez adresser une réclamation à la Commission nationale de l'informatique et des libertés
          (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou sur{' '}
          <a className="font-semibold text-primary hover:underline" href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            www.cnil.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection titre="Décision automatisée">
        <p>
          Aucune décision produisant des effets juridiques à votre égard n'est prise sur le seul
          fondement d'un traitement automatisé. L'aide au choix des matériaux proposée par le site
          est indicative : le devis est établi par les équipes de {ENTREPRISE.nomCommercial}.
        </p>
      </LegalSection>

      <LegalSection titre="Modifications">
        <p>
          Cette politique peut évoluer avec le service. La date de dernière mise à jour figure en bas
          de page. Les{' '}
          <Link className="font-semibold text-primary hover:underline" to="/mentions-legales">
            mentions légales
          </Link>{' '}
          complètent le présent document.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
