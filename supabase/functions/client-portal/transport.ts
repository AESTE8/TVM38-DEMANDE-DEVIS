import { json } from '../_shared/http.ts';
import { publicDeliveryDocuments, hasDeliveryDocument } from './transport-documents.mjs';

/** Appelé seulement après requireClient. Le devis doit appartenir au client connecté. */
export async function deliveryDocuments(db: any, clientId: string, segments: string[]) {
  const [, devisId, livraisonId, documentId] = segments;
  if (!devisId || ![2, 4].includes(segments.length)) return json(404, {error: 'NOT_FOUND'});
  const quote = await db.from('devis').select('id').eq('id', devisId).eq('client_id', clientId)
    .in('etat', ['envoye', 'accepte', 'refuse', 'planifie', 'termine']).maybeSingle();
  if (quote.error) return json(503, {error: 'DOCUMENTS_UNAVAILABLE'});
  if (!quote.data) return json(404, {error: 'NOT_FOUND'});
  const result = await db.from('tvm_livraisons').select('id,numero,contenu,planning').eq('devis_id', devisId).order('numero');
  if (result.error) return json(503, {error: 'DOCUMENTS_UNAVAILABLE'});
  const rows = result.data || [];
  if (segments.length === 2) return json(200, {livraisons: publicDeliveryDocuments(rows)});
  if (!hasDeliveryDocument(rows, livraisonId, documentId)) return json(404, {error: 'NOT_FOUND'});
  try {
    const url = Deno.env.get('TRANSPORT_PEER_URL');
    const key = Deno.env.get('TRANSPORT_BRIDGE_KEY');
    if (!url?.startsWith('https://') || !key || key.length < 32) throw new Error('Bridge unavailable');
    const response = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json','x-transport-key':key},
      body:JSON.stringify({action:'document',livraisonId,documentId}), signal:AbortSignal.timeout(15000)});
    if (!response.ok) return json(404, {error: 'DOCUMENT_UNAVAILABLE'});
    const signed = await response.json();
    const target = new URL(signed.url);
    // Seule l’URL de stockage renvoyée par notre serveur Planning est acceptée.
    if (target.protocol !== 'https:' || target.hostname !== new URL(url).hostname || !target.pathname.startsWith('/storage/v1/')) throw new Error('Invalid storage URL');
    const file = await fetch(target, {signal:AbortSignal.timeout(15000), redirect:'error'});
    if (!file.ok) return json(404, {error:'DOCUMENT_UNAVAILABLE'});
    const headers = new Headers(json(200, {}).headers);
    headers.set('Content-Type', file.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control','private, no-store');
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Content-Disposition', 'inline');
    return new Response(file.body, {status:200, headers});
  } catch { return json(503, {error:'DOCUMENTS_UNAVAILABLE'}); }
}
