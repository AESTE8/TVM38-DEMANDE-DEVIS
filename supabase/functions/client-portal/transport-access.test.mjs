import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('./transport.ts',import.meta.url),'utf8')
 .replace("import { json } from '../_shared/http.ts';", "const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});")
 .replace("'./transport-documents.mjs'",JSON.stringify(new URL('./transport-documents.mjs',import.meta.url).href));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {deliveryDocuments}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const rows=[{id:'livraison',numero:1,planning:{documents:[{id:'photo',kind:'materiaux',tour:1}]}}];
function db(owned=true) {
 const seen=[];
 return {seen,from(table){
  seen.push(table);const filters={};
  const query={select(){return query},eq(key,value){filters[key]=value;return query},in(){return query},
   async maybeSingle(){assert.equal(filters.client_id,'client-session');assert.equal(filters.id,'devis');return {data:owned?{id:'devis'}:null}},
   async order(){assert.equal(filters.devis_id,'devis');return {data:rows}}};return query;
 }};
}
test('refuse le devis d’un autre client avant lecture des livraisons',async()=>{
 const fake=db(false);const res=await deliveryDocuments(fake,'client-session',['livraisons','devis']);
 assert.equal(res.status,404);assert.deepEqual(fake.seen,['devis']);
});
test('liste uniquement les documents du devis possédé et rejette une pièce injectée',async()=>{
 const res=await deliveryDocuments(db(),'client-session',['livraisons','devis']);
 assert.equal(res.status,200);assert.equal((await res.json()).livraisons[0].documents[0].id,'photo');
 assert.equal((await deliveryDocuments(db(),'client-session',['livraisons','devis','livraison','intrus'])).status,404);
});
test('sert une photo via le serveur Planning et désactive son cache',async()=>{
 const oldFetch=globalThis.fetch,oldDeno=globalThis.Deno;
 globalThis.Deno={env:{get:key=>key==='TRANSPORT_PEER_URL'?'https://planning.supabase.co/functions/v1/planning-tvm38':'x'.repeat(40)}};
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push([String(url),options]);
  return calls.length===1?new Response(JSON.stringify({url:'https://planning.supabase.co/storage/v1/object/sign/photo'})):new Response('image',{headers:{'Content-Type':'image/jpeg'}});
 };
 try {
  const res=await deliveryDocuments(db(),'client-session',['livraisons','devis','livraison','photo']);
  assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'private, no-store');
  assert.equal(await res.text(),'image');assert.deepEqual(JSON.parse(calls[0][1].body),{action:'document',livraisonId:'livraison',documentId:'photo'});
 } finally {globalThis.fetch=oldFetch;globalThis.Deno=oldDeno;}
});
