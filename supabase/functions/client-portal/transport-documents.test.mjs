import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicDeliveryDocuments,hasDeliveryDocument} from './transport-documents.mjs';
test('expose uniquement les preuves client sans données internes et sans doublon',()=>{
 const rows=[{id:'l',numero:1,contenu:{date:'2026-09-20',note:'interne'},planning:{tache:{date:'2026-09-21',chauffeur_nom:'interne'},documents:[{id:'b',kind:'bon',path:'privé'},{id:'b',kind:'bon'},{id:'p',kind:'materiaux',tour:2},{id:'secret',kind:'interne'}]}}];
 const result=publicDeliveryDocuments(rows);
 assert.equal(result[0].date,'2026-09-21');assert.equal(result[0].documents.length,2);
 assert.equal(JSON.stringify(result).includes('interne'),false);assert.equal(JSON.stringify(result).includes('privé'),false);
 assert.equal(hasDeliveryDocument(rows,'l','p'),true);assert.equal(hasDeliveryDocument(rows,'autre','p'),false);
 assert.equal(hasDeliveryDocument(rows,'l','secret'),false);assert.equal(hasDeliveryDocument([], 'l','p'),false);
});
