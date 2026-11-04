import assert from 'node:assert/strict';
import {demoSeed,applyDemoCommand} from '../frontend/demo-adapter.js';
let s=demoSeed();
assert.equal(s.assets.length,151);const initial=structuredClone(s);
const cmd={type:'create_event',name:'Prueba estática',place:'Escenario A',responsible:'Krew QA',start:s.events[0].start,end:s.events[0].end,assetIds:['TAM-SCM-001-BD1','TAM-SCM-001-T10']};
s=applyDemoCommand(s,cmd);const eventId=s.events.at(-1).id;
assert.equal(s.kits[0].assembled,false);assert.equal(initial.assets[0].status,'available');
assert.throws(()=>applyDemoCommand(s,cmd));
s=applyDemoCommand(s,{type:'dispatch',responsibleId:'TEC-01',eventId,assetIds:cmd.assetIds});
s=applyDemoCommand(s,{type:'return',responsibleId:'TEC-02',eventId,assetIds:['TAM-SCM-001-BD1'],condition:'ok'});
assert.equal(s.assets.find(a=>a.id==='TAM-SCM-001-BD1').status,'available');
assert.equal(s.assets.find(a=>a.id==='TAM-SCM-001-T10').status,'out');
assert.equal(s.assets.find(a=>a.id==='TAM-SCM-001-T12').status,'available');
assert.equal(s.movements.length,4);
let whole=applyDemoCommand(demoSeed(),{...cmd,assetIds:demoSeed().kits[0].expectedIds});
assert.equal(whole.assets.filter(a=>a.status==='reserved').length,33);
whole=applyDemoCommand(whole,{type:'dispatch',responsibleId:'TEC-01',eventId:whole.events.at(-1).id,assetIds:whole.kits[0].expectedIds});
whole=applyDemoCommand(whole,{type:'return',responsibleId:'TEC-02',eventId:whole.events.at(-1).id,assetIds:['TAM-SCM-001-BD1'],condition:'damage',note:'Golpe'});
assert.equal(whole.assets.find(a=>a.id==='TAM-SCM-001-BD1').status,'maintenance');
assert.throws(()=>applyDemoCommand(whole,{type:'kit_mode',kitId:'TAM-SCM-001',assembled:true}));
let moved=applyDemoCommand(demoSeed(),{type:'transfer',assetIds:demoSeed().kits[1].expectedIds,warehouse:'Bodega B'});
assert.ok(moved.assets.filter(a=>a.kitId==='TAM-SCM-002').every(a=>a.location==='Bodega B'&&a.home==='Bodega B'));assert.equal(moved.kits[1].assembled,true);
assert.throws(()=>applyDemoCommand(moved,{type:'transfer',assetIds:['MAR-1960B-001'],warehouse:'Bodega C'}));
moved=applyDemoCommand(moved,{type:'create_event',name:'Traslado QA',place:'Sala',responsible:'QA',start:moved.events[0].start,end:moved.events[0].end,assetIds:['TAM-SCM-002-SN']});const ev=moved.events.at(-1).id;
moved=applyDemoCommand(moved,{type:'dispatch',responsibleId:'TEC-01',eventId:ev,assetIds:['TAM-SCM-002-SN']});moved=applyDemoCommand(moved,{type:'return',responsibleId:'TEC-02',eventId:ev,assetIds:['TAM-SCM-002-SN'],condition:'ok'});
assert.equal(moved.assets.find(a=>a.id==='TAM-SCM-002-SN').location,'Bodega B');
assert.throws(()=>applyDemoCommand(demoSeed(),{type:'crew_rename',crewId:'TEC-01',name:''}));assert.equal(applyDemoCommand(demoSeed(),{type:'crew_rename',crewId:'TEC-01',name:'Ana QA'}).crew[0].name,'Ana QA');
{const t=demoSeed(),ev=t.events[0].id,d=t.events[0].start.slice(0,10);const u=applyDemoCommand(t,{type:'timing_save',eventId:ev,activities:[{id:'AB1',type:'performance',title:'Banda 1',stageId:'S1',start:d+'T20:30',end:d+'T21:30'}]});assert.equal(u.events[0].timing.length,1);assert.throws(()=>applyDemoCommand(t,{type:'timing_save',eventId:ev,activities:[{id:'AB1',type:'performance',title:'X',stageId:'S1',start:d+'T21:30',end:d+'T20:30'}]}));}
console.log('PASS static demo: counts, no source mutation, duplicate protection, complete kit, partial reserve/dispatch/return, damaged return and audit.');
{ // Afiche del evento y alta/baja de técnicos en la demo estática
  const jpg='data:image/jpeg;base64,'+btoa('\xff\xd8\xffafiche');let d=demoSeed();const free=d.assets.find(a=>a.status==='available'&&a.condition==='ok').id;
  const base={type:'create_event',name:'Afiche QA',place:'Sala',responsible:'QA',start:'2030-01-01T10:00',end:'2030-01-02T10:00',assetIds:[free]};
  assert.throws(()=>applyDemoCommand(d,{...base,poster:'data:image/png;base64,AAAA'}));
  d=applyDemoCommand(d,{...base,poster:jpg});const e=d.events.at(-1);assert.equal(e.poster,jpg);
  d=applyDemoCommand(d,{type:'event_poster',eventId:e.id,poster:''});assert.equal(d.events.at(-1).poster,'');
  let c=applyDemoCommand(demoSeed(),{type:'crew_add',name:'Ana Rock'});const n=c.crew.length;assert.equal(c.crew.at(-1).active,true);
  assert.throws(()=>applyDemoCommand(c,{type:'crew_add',name:'ana rock'}));
  c=applyDemoCommand(c,{type:'crew_remove',crewId:c.crew.at(-1).id});assert.equal(c.crew.at(-1).active,false);
  c=applyDemoCommand(c,{type:'crew_add',name:'Ana Rock'});assert.equal(c.crew.length,n);assert.equal(c.crew.at(-1).active,true);
  {let t=demoSeed();const a=t.assets[0],o=t.assets[1];t=applyDemoCommand(t,{type:'asset_update',assetId:a.id,name:a.name,category:a.category,code:'nuevo-cod-01'});const n=t.assets.find(x=>x.id===a.id);assert.equal(n.code,'NUEVO-COD-01');
   assert.throws(()=>applyDemoCommand(t,{type:'asset_update',assetId:a.id,name:a.name,category:a.category,code:o.code}));assert.throws(()=>applyDemoCommand(t,{type:'create_asset',code:a.id,name:'Copia',category:'Accesorios',location:'Bodega A'}));}
  console.log('PASS static demo: afiche del evento y alta/baja de técnicos.');
}
