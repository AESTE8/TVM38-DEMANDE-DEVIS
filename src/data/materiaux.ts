import { Materiau } from '@/types';

export const SECTION_ORDER = [
  'Matériaux recyclés',
  'Matériaux paysagers',
  'Déblais en décharge',
  'Matériaux silico-calcaire',
  'Matériaux calcaire',
  'Matériaux éruptifs',
  'Sable',
  'Enrobé',
] as const;

export const MATERIAUX: Materiau[] = [
  // Matériaux recyclés
  { id: 'b11', code: 'B.1.1', nom: 'Enrobé concassé 0/25',              section: 'Matériaux recyclés',         masseVolumique: 1.8 },
  { id: 'b12', code: 'B.1.2', nom: 'Grave concassé 0/25',               section: 'Matériaux recyclés',         masseVolumique: 1.8 },
  { id: 'b13', code: 'B.1.3', nom: 'Grave concassé 0/80',               section: 'Matériaux recyclés',         masseVolumique: 1.8 },
  { id: 'b14', code: 'B.1.4', nom: 'Grave concassé mixte 0/25',         section: 'Matériaux recyclés',         masseVolumique: 1.8 },
  // Matériaux paysagers
  { id: 'b21', code: 'B.2.1', nom: 'Terre criblée 0/10',                section: 'Matériaux paysagers',        masseVolumique: 1.5 },
  { id: 'b22', code: 'B.2.2', nom: 'Terre criblée 0/30',                section: 'Matériaux paysagers',        masseVolumique: 1.5 },
  { id: 'b23', code: 'B.2.3', nom: 'Terre criblée amendée',             section: 'Matériaux paysagers',        masseVolumique: 1.4 },
  { id: 'b24', code: 'B.2.4', nom: 'Mélange terre pierres',             section: 'Matériaux paysagers',        masseVolumique: 1.6 },
  { id: 'b25', code: 'B.2.5', nom: "Blocs d'enrochement",               section: 'Matériaux paysagers',        masseVolumique: 2.5 },
  { id: 'b26', code: 'B.2.6', nom: "Blocs d'enrochement paysager",      section: 'Matériaux paysagers',        masseVolumique: 2.5 },
  // Déblais en décharge
  { id: 'b31', code: 'B.3.1', nom: 'Déblais béton pierre trié',         section: 'Déblais en décharge',        masseVolumique: 2.0 },
  { id: 'b32', code: 'B.3.2', nom: 'Déblais béton ferraillé',           section: 'Déblais en décharge',        masseVolumique: 2.0 },
  { id: 'b33', code: 'B.3.3', nom: 'Déblais de tranchée criblables',    section: 'Déblais en décharge',        masseVolumique: 1.8 },
  { id: 'b34', code: 'B.3.4', nom: 'Déblais non recyclables',           section: 'Déblais en décharge',        masseVolumique: 1.8 },
  { id: 'b35', code: 'B.3.5', nom: 'Enrobé trié',                       section: 'Déblais en décharge',        masseVolumique: 2.3 },
  // Matériaux silico-calcaire
  { id: 'b41', code: 'B.4.1', nom: 'Tout-venant 0/60',                  section: 'Matériaux silico-calcaire',  masseVolumique: 1.9 },
  { id: 'b42', code: 'B.4.2', nom: 'Sable de remblaiement',             section: 'Matériaux silico-calcaire',  masseVolumique: 1.5 },
  { id: 'b43', code: 'B.4.3', nom: 'Galets 20/40 lavés',               section: 'Matériaux silico-calcaire',  masseVolumique: 1.6 },
  { id: 'b44', code: 'B.4.4', nom: 'Galets 40/100',                     section: 'Matériaux silico-calcaire',  masseVolumique: 1.6 },
  { id: 'b45', code: 'B.4.5', nom: 'Gravette 4/12 roulée lavée',        section: 'Matériaux silico-calcaire',  masseVolumique: 1.6 },
  { id: 'b46', code: 'B.4.6', nom: 'Gravette 11/22 roulée lavée',       section: 'Matériaux silico-calcaire',  masseVolumique: 1.6 },
  // Matériaux calcaire
  { id: 'b51', code: 'B.5.1', nom: 'Calcaire concassé 0/15',            section: 'Matériaux calcaire',         masseVolumique: 1.8 },
  { id: 'b52', code: 'B.5.2', nom: 'Calcaire concassé 0/31.5',          section: 'Matériaux calcaire',         masseVolumique: 1.8 },
  { id: 'b53', code: 'B.5.3', nom: 'Concassé 0/100',                    section: 'Matériaux calcaire',         masseVolumique: 1.8 },
  // Matériaux éruptifs
  { id: 'b61', code: 'B.6.1', nom: 'Granit 0/20',                       section: 'Matériaux éruptifs',         masseVolumique: 1.7 },
  { id: 'b62', code: 'B.6.2', nom: 'Granit 20/60 concassé',             section: 'Matériaux éruptifs',         masseVolumique: 1.7 },
  { id: 'b63', code: 'B.6.3', nom: 'Granit 60/100 pour gabions',        section: 'Matériaux éruptifs',         masseVolumique: 1.7 },
  // Sable
  { id: 'b71', code: 'B.7.1', nom: 'Sable concassé 0/4',                section: 'Sable',                      masseVolumique: 1.5 },
  // Enrobé
  { id: 'b81', code: 'B.8.1', nom: 'Enrobé à froid COMPOMAC 0/6',       section: 'Enrobé',                     masseVolumique: 2.3 },
];
