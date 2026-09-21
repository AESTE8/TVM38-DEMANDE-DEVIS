import { useCallback, useEffect, useState } from 'react';
import { Camera, FileCheck, RefreshCw } from 'lucide-react';
import { fetchLivraisonDocuments, ouvrirLivraisonDocument, formatDate, type LivraisonDocuments as Delivery } from '@/lib/portal';

export default function LivraisonDocuments({devisId}: {devisId: string}) {
  const [rows,setRows]=useState<Delivery[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(value=>value+1),[]);
  useEffect(()=>{
    let active=true;
    setLoading(true); setError('');
    fetchLivraisonDocuments(devisId).then(data=>{if(active)setRows(data.livraisons);})
      .catch(()=>{if(active)setError('Les justificatifs ne peuvent pas être chargés. Réessayez.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[devisId,revision]);
  useEffect(()=>{window.addEventListener('focus',reload); return ()=>window.removeEventListener('focus',reload);},[reload]);
  return <section className="rounded-xl border border-border bg-white p-5 space-y-4" aria-label="Bons et photos de livraison">
    <div className="flex items-center justify-between gap-3"><h2 className="font-headline text-lg font-bold">Bons et photos de livraison</h2><button type="button" onClick={reload} disabled={loading} className="min-h-11 min-w-11 rounded-lg border p-2" aria-label="Actualiser les justificatifs"><RefreshCw size={18}/></button></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="text-sm text-secondary">Chargement des justificatifs…</p>}
    {!loading && !error && rows.length===0 && <p className="text-sm text-secondary">Les bons signés et les photos de déchargement apparaîtront ici après leur transmission.</p>}
    {rows.map(row=><div key={row.id} className="space-y-2">
      <h3 className="font-semibold text-sm">{row.journee ? `Journée ${row.journee} / ${row.totalJournees}` : `Livraison ${row.numero}`} · {formatDate(row.date)}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{row.documents.map((doc,index)=><button type="button" key={doc.id} className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm hover:bg-surface-container-low" onClick={()=>void ouvrirLivraisonDocument(devisId,row.id,doc.id).catch(()=>setError('Impossible d’ouvrir ce document. Actualisez les justificatifs.'))}>
        {doc.kind==='bon'?<FileCheck className="shrink-0 text-primary"/>:<Camera className="shrink-0 text-primary"/>}<span className="font-medium">{doc.kind==='bon'?'Bon de prestation signé':`Photo du déchargement · tour ${doc.tour || '—'}`}<span className="block text-xs font-normal text-secondary">{doc.date?new Date(doc.date).toLocaleString('fr-FR'):`Document ${index+1}`} · Ouvrir</span></span>
      </button>)}</div>
    </div>)}
  </section>;
}
