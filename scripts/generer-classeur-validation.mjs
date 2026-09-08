// Génère VALIDATION-Aide-au-choix-des-materiaux.xlsx à partir de
// src/data/guide.data.json et src/data/materiaux.ts.
//
// Le classeur est le document relu par le responsable carrière. Il ne se
// modifie jamais à la main : on corrige le JSON, puis on régénère.
//
//   npm i -D exceljs
//   node scripts/generer-classeur-validation.mjs
//
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? path.join(REPO, 'VALIDATION-Aide-au-choix-des-materiaux.xlsx');

const guide = JSON.parse(readFileSync(path.join(REPO, 'src/data/guide.data.json'), 'utf8'));

// --- lecture de materiaux.ts -------------------------------------------------
const tsSrc = readFileSync(path.join(REPO, 'src/data/materiaux.ts'), 'utf8');
const MAT = {};
const re = /\{\s*id:\s*'([^']+)',\s*code:\s*'([^']+)',\s*nom:\s*(?:'([^']*)'|"([^"]*)"),\s*section:\s*'([^']+)',\s*masseVolumique:\s*([\d.]+)\s*\}/g;
let m;
while ((m = re.exec(tsSrc)) !== null) {
  MAT[m[1]] = { id: m[1], code: m[2], nom: m[3] ?? m[4], section: m[5], densite: parseFloat(m[6]) };
}
if (Object.keys(MAT).length === 0) {
  throw new Error('Aucun matériau lu dans src/data/materiaux.ts — le format du fichier a changé, adapter la lecture.');
}

// --- charte -----------------------------------------------------------------
const BLEU = 'FF0053A1';
const BLEU_CLAIR = 'FFE8F2FC';
const BLEU_TRES_CLAIR = 'FFF4F8FF';
const ROUGE = 'FFD8002B';
const GRIS = 'FF4A6A82';
const BLANC = 'FFFFFFFF';
const JAUNE = 'FFFFF4CE';

const wb = new ExcelJS.Workbook();
wb.creator = 'TVM38 — Demande de devis en ligne';
wb.created = new Date();

const border = {
  top: { style: 'thin', color: { argb: 'FFBDD4EA' } },
  left: { style: 'thin', color: { argb: 'FFBDD4EA' } },
  bottom: { style: 'thin', color: { argb: 'FFBDD4EA' } },
  right: { style: 'thin', color: { argb: 'FFBDD4EA' } },
};

function titreFeuille(ws, titre, sousTitre, nbCols) {
  ws.mergeCells(1, 1, 1, nbCols);
  const t = ws.getCell(1, 1);
  t.value = titre;
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: BLANC } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU } };
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, nbCols);
  const s = ws.getCell(2, 1);
  s.value = sousTitre;
  s.font = { name: 'Calibri', size: 10, italic: true, color: { argb: GRIS } };
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 22;
}

function enTetes(ws, ligne, colonnes) {
  const row = ws.getRow(ligne);
  colonnes.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.value = c.titre;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANC } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.accent ?? GRIS } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = border;
  });
  row.height = 38;
  ws.columns = colonnes.map(c => ({ width: c.largeur }));
}

function styleCorps(ws, premiereLigne, derniereLigne, nbCols) {
  for (let r = premiereLigne; r <= derniereLigne; r++) {
    const row = ws.getRow(r);
    row.alignment = { vertical: 'top', wrapText: true };
    for (let c = 1; c <= nbCols; c++) {
      const cell = row.getCell(c);
      cell.border = border;
      cell.font = { name: 'Calibri', size: 10, ...(cell.font ?? {}) };
    }
  }
}

function colonneValidation(ws, colValidation, premiereLigne, derniereLigne) {
  for (let r = premiereLigne; r <= derniereLigne; r++) {
    const cell = ws.getCell(r, colValidation);
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"OK,À corriger,À supprimer"'],
      showErrorMessage: true,
      errorTitle: 'Valeur non prévue',
      error: 'Choisissez OK, À corriger ou À supprimer.',
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: JAUNE } };
  }
  const lettre = ws.getColumn(colValidation).letter;
  ws.addConditionalFormatting({
    ref: `${lettre}${premiereLigne}:${lettre}${derniereLigne}`,
    rules: [
      { type: 'cellIs', operator: 'equal', formulae: ['"OK"'], priority: 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD6F0D8' } }, font: { bold: true, color: { argb: 'FF1B5E20' } } } },
      { type: 'cellIs', operator: 'equal', formulae: ['"À corriger"'], priority: 2,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE0B2' } }, font: { bold: true, color: { argb: 'FF8A4B00' } } } },
      { type: 'cellIs', operator: 'equal', formulae: ['"À supprimer"'], priority: 3,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF8D0D6' } }, font: { bold: true, color: { argb: 'FF8A0018' } } } },
    ],
  });
}

function miseEnPage(ws, nbCols, ligneFigee) {
  ws.views = [{ state: 'frozen', ySplit: ligneFigee, xSplit: 0 }];
  ws.pageSetup = {
    orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    printTitlesRow: `${ligneFigee}:${ligneFigee}`,
  };
  ws.headerFooter = { oddFooter: '&LTVM38 — Aide au choix des matériaux&CÀ valider par le responsable carrière&R&P/&N' };
  ws.autoFilter = { from: { row: ligneFigee, column: 1 }, to: { row: ligneFigee, column: nbCols } };
}

const coef = k => guide.coefficients[k];
const nomMat = id => MAT[id]?.nom ?? `??? (${id})`;
const codeMat = id => MAT[id]?.code ?? '???';
const densMat = id => MAT[id]?.densite ?? 0;

// =============================================================================
// 1. Mode d'emploi
// =============================================================================
{
  const ws = wb.addWorksheet("Mode d'emploi", { properties: { tabColor: { argb: BLEU } } });
  ws.columns = [{ width: 4 }, { width: 40 }, { width: 96 }];
  titreFeuille(ws, "Aide au choix des matériaux — document de validation", "Site de demande de devis TVM38 · version " + guide.version + " · à valider avant mise en ligne", 3);

  const blocs = [
    ['À quoi sert ce document', "Le formulaire de demande de devis en ligne va proposer un assistant : le client indique ce qu'il veut faire (une allée, un drain, un massif…), et le site lui propose les matériaux correspondants, avec l'épaisseur conseillée et le tonnage calculé. Ce classeur est la totalité de ce que le site dira aux clients. Rien ne sera mis en ligne avant votre validation."],
    ['Ce que je vous demande', "Parcourir les onglets « Livraison », « Décharge » et « Fiches matériaux ». Sur chaque ligne, choisir OK, À corriger ou À supprimer dans la colonne de validation (liste déroulante), et écrire la correction dans la colonne de droite quand il y en a une."],
    ['Les points à regarder en priorité', "1. Les épaisseurs conseillées correspondent-elles à ce que vous recommandez au téléphone ?\n2. Les matériaux proposés sont-ils les bons pour chaque usage ?\n3. Les mises en garde (colonne « à éviter ») sont-elles justes ?\n4. Le classement des déblais en décharge correspond-il à ce que vous acceptez au pont-bascule ?"],
    ['Comment sont calculés les tonnages', "Surface × épaisseur = volume géométrique, puis multiplication par un coefficient de compactage, puis par la densité du matériau. Le détail figure dans l'onglet « Hypothèses de calcul ». Le client voit ce détail à l'écran : il peut vérifier le calcul."],
    ['Ce qui est affiché au client', "Une mention accompagne systématiquement le résultat : « Estimation indicative pour vous aider à commander. Pour un ouvrage soumis à charge lourde, faites valider par votre maçon. » Le site ne se substitue pas à une étude."],
    ['Ce que vous recevrez en plus', "Le contexte déclaré par le client (projet, dimensions, épaisseurs) sera repris dans les notes de la demande de devis. Vous verrez donc, avant de chiffrer, ce que le client cherche réellement à faire — et vous pourrez le corriger s'il s'est trompé."],
  ];

  let r = 4;
  for (const [titre, texte] of blocs) {
    const c1 = ws.getCell(r, 2);
    c1.value = titre;
    c1.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLEU } };
    c1.alignment = { vertical: 'top', wrapText: true };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU_CLAIR } };
    c1.border = border;
    const c2 = ws.getCell(r, 3);
    c2.value = texte;
    c2.font = { name: 'Calibri', size: 10 };
    c2.alignment = { vertical: 'top', wrapText: true };
    c2.border = border;
    ws.getRow(r).height = Math.max(34, Math.ceil(texte.length / 105) * 15 + 18);
    r += 1;
  }

  r += 1;
  const sig = ws.getCell(r, 2);
  sig.value = 'Validé par';
  sig.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLANC } };
  sig.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
  sig.border = border;
  const sig2 = ws.getCell(r, 3);
  sig2.value = 'Nom :                                          Date :                              Observations générales :';
  sig2.font = { name: 'Calibri', size: 10 };
  sig2.border = border;
  ws.getRow(r).height = 40;

  ws.pageSetup = { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

// =============================================================================
// 2. Livraison — structures conseillées
// =============================================================================
{
  const cols = [
    { titre: 'Projet du client', largeur: 22, accent: BLEU },
    { titre: 'Question posée par le site', largeur: 24, accent: BLEU },
    { titre: 'Réponse du client', largeur: 26, accent: BLEU },
    { titre: 'Couche', largeur: 8, accent: GRIS },
    { titre: 'Rôle de la couche', largeur: 18, accent: GRIS },
    { titre: 'Code', largeur: 8, accent: GRIS },
    { titre: 'Matériau proposé', largeur: 28, accent: GRIS },
    { titre: 'Épaisseur\nconseillée (cm)', largeur: 12, accent: ROUGE },
    { titre: 'Compactage', largeur: 14, accent: ROUGE },
    { titre: 'Coeff.', largeur: 7, accent: ROUGE },
    { titre: 'Densité\n(t/m³)', largeur: 8, accent: ROUGE },
    { titre: 'Exemple : 50 m²\n→ tonnes', largeur: 13, accent: ROUGE },
    { titre: 'Conseil technique affiché au client', largeur: 48, accent: GRIS },
    { titre: 'Validation', largeur: 13, accent: 'FF8A4B00' },
    { titre: 'Correction / remarque du responsable carrière', largeur: 42, accent: 'FF8A4B00' },
  ];
  const ws = wb.addWorksheet('Livraison — structures', { properties: { tabColor: { argb: BLEU } } });
  titreFeuille(ws, 'Livraison — structures conseillées par type de projet',
    "Chaque bloc = un parcours client complet. Les couches d'un même bloc sont proposées ensemble (le client peut en décocher).", cols.length);
  enTetes(ws, 4, cols);

  let r = 5;
  const debut = r;
  for (const projet of guide.projets) {
    const debutProjet = r;
    for (const v of projet.variantes) {
      const debutVariante = r;
      v.couches.forEach((c, i) => {
        const co = coef(c.compactage);
        const d = densMat(c.materiauId);
        const ep = c.epaisseurCm;
        const exemple = ep > 0 ? Math.round(50 * (ep / 100) * co.valeur * d * 10) / 10 : null;
        const row = ws.getRow(r);
        row.getCell(1).value = i === 0 && r === debutProjet ? projet.label : '';
        row.getCell(2).value = i === 0 && r === debutProjet ? projet.question2 : '';
        row.getCell(3).value = i === 0 ? v.label + (v.aide ? `\n(${v.aide})` : '') : '';
        row.getCell(4).value = `${i + 1}/${v.couches.length}`;
        row.getCell(5).value = c.role;
        row.getCell(6).value = codeMat(c.materiauId);
        row.getCell(7).value = nomMat(c.materiauId);
        row.getCell(8).value = ep > 0 ? ep : 'selon volume';
        row.getCell(9).value = co.libelle;
        row.getCell(10).value = co.valeur;
        row.getCell(11).value = d;
        row.getCell(12).value = exemple ?? 'n/a';
        row.getCell(13).value = i === 0 ? [v.note, v.nonFourni ? `NON FOURNI PAR TVM38 : ${v.nonFourni}` : null].filter(Boolean).join('\n') : '';
        row.getCell(1).font = { bold: true, color: { argb: BLEU }, size: 11 };
        row.getCell(3).font = { bold: true };
        row.getCell(7).font = { bold: true };
        row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
        [10, 11, 12].forEach(c2 => { row.getCell(c2).alignment = { horizontal: 'center', vertical: 'middle' }; });
        if (v.nonFourni) row.getCell(13).font = { color: { argb: ROUGE } };
        row.height = 30;
        r += 1;
      });
      if (v.couches.length > 1) {
        ws.mergeCells(debutVariante, 3, r - 1, 3);
        ws.mergeCells(debutVariante, 13, r - 1, 13);
        ws.mergeCells(debutVariante, 14, r - 1, 14);
        ws.mergeCells(debutVariante, 15, r - 1, 15);
      }
    }
    ws.mergeCells(debutProjet, 1, r - 1, 1);
    ws.mergeCells(debutProjet, 2, r - 1, 2);
    ws.getCell(debutProjet, 1).alignment = { vertical: 'middle', wrapText: true };
    ws.getCell(debutProjet, 2).alignment = { vertical: 'middle', wrapText: true };
    for (let c = 1; c <= cols.length; c++) {
      ws.getCell(r - 1, c).border = { ...border, bottom: { style: 'medium', color: { argb: BLEU } } };
    }
  }
  const fin = r - 1;
  styleCorps(ws, debut, fin, cols.length);
  for (let rr = debut; rr <= fin; rr++) {
    for (const c of [1, 2, 3]) {
      const cell = ws.getCell(rr, c);
      if (!cell.isMerged || cell.master === cell) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU_TRES_CLAIR } };
      }
    }
  }
  colonneValidation(ws, 14, debut, fin);
  miseEnPage(ws, cols.length, 4);
}

// =============================================================================
// 3. Décharge — classement des déblais
// =============================================================================
{
  const cols = [
    { titre: "Origine déclarée par le client", largeur: 30, accent: BLEU },
    { titre: 'Question de contrôle posée par le site', largeur: 40, accent: BLEU },
    { titre: 'Réponse du client', largeur: 42, accent: BLEU },
    { titre: 'Code', largeur: 8, accent: GRIS },
    { titre: 'Classement retenu', largeur: 30, accent: GRIS },
    { titre: 'Densité\n(t/m³)', largeur: 9, accent: GRIS },
    { titre: 'Message affiché au client', largeur: 52, accent: GRIS },
    { titre: 'Validation', largeur: 13, accent: 'FF8A4B00' },
    { titre: 'Correction / remarque du responsable carrière', largeur: 42, accent: 'FF8A4B00' },
  ];
  const ws = wb.addWorksheet('Décharge — classement', { properties: { tabColor: { argb: 'FF7E57C2' } } });
  titreFeuille(ws, 'Décharge — identification de ce que le client apporte',
    "Objectif : éviter les chargements mal déclarés, refusés ou requalifiés au pont-bascule.", cols.length);
  enTetes(ws, 4, cols);

  let r = 5;
  const debut = r;
  for (const o of guide.decharge.origines) {
    const debutOrigine = r;
    for (const rep of o.reponses) {
      const row = ws.getRow(r);
      row.getCell(1).value = o.label;
      row.getCell(2).value = o.question2 ?? '— (aucune question complémentaire)';
      row.getCell(3).value = rep.label;
      row.getCell(4).value = codeMat(rep.materiauId);
      row.getCell(5).value = nomMat(rep.materiauId);
      row.getCell(6).value = densMat(rep.materiauId);
      row.getCell(7).value = o.note ?? (guide.materiaux[rep.materiauId]?.eviter ?? '');
      row.getCell(1).font = { bold: true, color: { argb: BLEU }, size: 11 };
      row.getCell(5).font = { bold: true };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.height = 30;
      r += 1;
    }
    if (o.reponses.length > 1) {
      ws.mergeCells(debutOrigine, 1, r - 1, 1);
      ws.mergeCells(debutOrigine, 2, r - 1, 2);
      ws.getCell(debutOrigine, 1).alignment = { vertical: 'middle', wrapText: true };
      ws.getCell(debutOrigine, 2).alignment = { vertical: 'middle', wrapText: true };
    }
    for (let c = 1; c <= cols.length; c++) {
      ws.getCell(r - 1, c).border = { ...border, bottom: { style: 'medium', color: { argb: BLEU } } };
    }
  }
  const fin = r - 1;
  styleCorps(ws, debut, fin, cols.length);
  colonneValidation(ws, 8, debut, fin);
  miseEnPage(ws, cols.length, 4);
}

// =============================================================================
// 4. Fiches matériaux
// =============================================================================
{
  const cols = [
    { titre: 'Section du catalogue', largeur: 24, accent: BLEU },
    { titre: 'Code', largeur: 9, accent: BLEU },
    { titre: 'Matériau', largeur: 30, accent: BLEU },
    { titre: 'Densité\n(t/m³)', largeur: 9, accent: GRIS },
    { titre: 'Usages (filtres du site)', largeur: 28, accent: GRIS },
    { titre: 'Phrase affichée sous le nom du matériau', largeur: 52, accent: GRIS },
    { titre: 'Mise en garde « à éviter »', largeur: 52, accent: ROUGE },
    { titre: "Proposé par l'assistant pour", largeur: 34, accent: GRIS },
    { titre: 'Validation', largeur: 13, accent: 'FF8A4B00' },
    { titre: 'Correction / remarque du responsable carrière', largeur: 42, accent: 'FF8A4B00' },
  ];
  const ws = wb.addWorksheet('Fiches matériaux', { properties: { tabColor: { argb: GRIS } } });
  titreFeuille(ws, 'Fiches matériaux — texte affiché dans la liste',
    "Les matériaux du catalogue. La phrase et la mise en garde s'affichent sous le nom, dans le formulaire.", cols.length);
  enTetes(ws, 4, cols);

  const emplois = {};
  for (const p of guide.projets) {
    for (const v of p.variantes) {
      for (const c of v.couches) {
        (emplois[c.materiauId] ??= []).push(`${p.label} / ${v.label} (${c.role})`);
      }
    }
  }
  for (const o of guide.decharge.origines) {
    for (const rep of o.reponses) {
      (emplois[rep.materiauId] ??= []).push(`Décharge : ${o.label}`);
    }
  }

  let r = 5;
  const debut = r;
  let sectionPrecedente = null;
  for (const id of Object.keys(MAT)) {
    const mat = MAT[id];
    const info = guide.materiaux[id] ?? {};
    const row = ws.getRow(r);
    row.getCell(1).value = mat.section !== sectionPrecedente ? mat.section : '';
    row.getCell(2).value = mat.code;
    row.getCell(3).value = mat.nom;
    row.getCell(4).value = mat.densite;
    row.getCell(5).value = (info.usages ?? []).join(', ');
    row.getCell(6).value = info.resume ?? '';
    row.getCell(7).value = info.eviter ?? '—';
    row.getCell(8).value = (emplois[id] ?? ['— (visible dans la liste, jamais proposé automatiquement)']).join('\n');
    row.getCell(1).font = { bold: true, color: { argb: BLEU }, size: 11 };
    row.getCell(3).font = { bold: true };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    if (info.eviter) row.getCell(7).font = { color: { argb: ROUGE } };
    row.height = 32;
    if (mat.section !== sectionPrecedente && r > debut) {
      for (let c = 1; c <= cols.length; c++) {
        ws.getCell(r - 1, c).border = { ...border, bottom: { style: 'medium', color: { argb: BLEU } } };
      }
    }
    sectionPrecedente = mat.section;
    r += 1;
  }
  const fin = r - 1;
  styleCorps(ws, debut, fin, cols.length);
  colonneValidation(ws, 9, debut, fin);
  miseEnPage(ws, cols.length, 4);
}

// =============================================================================
// 5. Hypothèses de calcul
// =============================================================================
{
  const ws = wb.addWorksheet('Hypothèses de calcul', { properties: { tabColor: { argb: ROUGE } } });
  ws.columns = [{ width: 4 }, { width: 26 }, { width: 12 }, { width: 78 }, { width: 14 }, { width: 40 }];
  titreFeuille(ws, 'Hypothèses de calcul des quantités', "Ce que le site applique pour passer des dimensions du client au tonnage commandé.", 6);

  ws.getCell(4, 2).value = 'Formule appliquée';
  ws.getCell(4, 2).font = { bold: true, size: 11, color: { argb: BLEU } };
  ws.mergeCells(4, 3, 4, 6);
  ws.getCell(4, 3).value = 'Tonnes = Surface (m²) × Épaisseur (m) × Coefficient de compactage × Densité (t/m³)';
  ws.getCell(4, 3).font = { bold: true, size: 11 };
  ws.getRow(4).height = 26;

  const enTete = ['', 'Coefficient', 'Valeur', 'Pourquoi', 'Validation', 'Correction / remarque'];
  const rowH = ws.getRow(6);
  enTete.forEach((t, i) => {
    if (i === 0) return;
    const cell = rowH.getCell(i + 1);
    cell.value = t;
    cell.font = { bold: true, color: { argb: BLANC }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border;
  });
  rowH.height = 30;

  let r = 7;
  const debut = r;
  for (const [, c] of Object.entries(guide.coefficients)) {
    const row = ws.getRow(r);
    row.getCell(2).value = c.libelle;
    row.getCell(3).value = c.valeur;
    row.getCell(4).value = c.explication;
    row.getCell(2).font = { bold: true };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.alignment = { vertical: 'top', wrapText: true };
    for (let c2 = 2; c2 <= 6; c2++) row.getCell(c2).border = border;
    row.height = 40;
    r += 1;
  }
  colonneValidation(ws, 5, debut, r - 1);

  r += 2;
  ws.getCell(r, 2).value = 'Exemple complet vérifiable';
  ws.getCell(r, 2).font = { bold: true, size: 11, color: { argb: BLEU } };
  r += 1;
  const t1 = Math.round(42 * 0.15 * 1.2 * densMat('b12') * 10) / 10;
  const t2 = Math.round(42 * 0.05 * 1.2 * densMat('b51') * 10) / 10;
  const exemple = [
    ['Projet', 'Allée, passage de véhicule léger, 12 m × 3,5 m'],
    ['Surface', '42 m²'],
    ['Couche 1 — Fondation', `${nomMat('b12')}, 15 cm, couche compactée`],
    ['Calcul couche 1', `42 × 0,15 × 1,20 × ${densMat('b12')} = ${t1} t`],
    ['Couche 2 — Finition', `${nomMat('b51')}, 5 cm, couche compactée`],
    ['Calcul couche 2', `42 × 0,05 × 1,20 × ${densMat('b51')} = ${t2} t`],
    ['Total proposé au client', `${Math.round((t1 + t2) * 10) / 10} t`],
    ['Contrôle camion', "Au-delà de la capacité du camion choisi, le site prévient : « 2 rotations nécessaires, ou un camion plus grand ». Message informatif, jamais bloquant."],
    ['Mention affichée', "Estimation indicative pour vous aider à commander. Pour un ouvrage soumis à charge lourde, faites valider par votre maçon."],
  ];
  for (const [k, v] of exemple) {
    ws.getCell(r, 2).value = k;
    ws.getCell(r, 2).font = { bold: true, size: 10 };
    ws.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU_CLAIR } };
    ws.mergeCells(r, 3, r, 6);
    ws.getCell(r, 3).value = v;
    ws.getCell(r, 3).alignment = { vertical: 'middle', wrapText: true };
    ws.getCell(r, 2).border = border;
    ws.getCell(r, 3).border = border;
    ws.getRow(r).height = 24;
    r += 1;
  }

  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

await wb.xlsx.writeFile(OUT);
console.log('Classeur généré :', OUT);
console.log('Matériaux lus :', Object.keys(MAT).length);
