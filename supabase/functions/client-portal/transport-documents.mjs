// Projection publique explicite : ni consignes internes, ni informations chauffeur.
export function publicDeliveryDocuments(rows) {
  return rows.map(row => ({
    id: row.id,
    numero: row.numero,
    date: row.planning?.tache?.date || row.planning?.demande?.date_debut || row.contenu?.date,
    journee: row.contenu?.journeeNumero || null,
    totalJournees: row.contenu?.journeesTotal || null,
    documents: [...new Map((row.planning?.documents || [])
      .filter(doc => doc.id && ['bon', 'materiaux'].includes(doc.kind))
      .map(doc => [doc.id, { id: doc.id, kind: doc.kind, tour: doc.tour || null, date: doc.captured_at || null }])).values()],
  })).filter(row => row.documents.length > 0);
}

export function hasDeliveryDocument(rows, livraisonId, documentId) {
  return publicDeliveryDocuments(rows).some(row => row.id === livraisonId && row.documents.some(doc => doc.id === documentId));
}
