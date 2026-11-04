// Browser-only simulator for the temporary static demo. PHP remains authoritative
// in the real installation. This module contains no SQL credentials or user data.
import seed from './demo-seed.json' with {type:'json'};
const ok=(condition,message)=>{if(!condition)throw new Error(message);};
const text=(value='',max=180)=>{ok(typeof value==='string'&&value.trim().length<=max,'Texto inválido o demasiado largo.');return value.trim();};
const phone=(v='')=>{const t=text(v||'',40);ok(t===''||/^\+?[0-9 ()-]{6,20}$/.test(t),'Revisa el teléfono: usa solo números, espacios y +.');return t;};
const find=(list,id)=>{const result=list.find(v=>v.id===id);ok(result,'No se encontró el registro: '+id);return result;};
const selected=cmd=>{const ids=cmd.assetIds;ok(Array.isArray(ids)&&ids.length>0&&ids.length<=500,'Selecciona al menos un equipo.');ok(ids.every(id=>typeof id==='string'&&id.length<100)&&new Set(ids).size===ids.length,'La selección tiene códigos inválidos o repetidos.');return ids;};
const uid=prefix=>prefix+'-'+crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
const isAvailable=a=>a.status==='available'&&a.condition==='ok';
// Bodegas propias, solo por letra: la app no guarda sus direcciones.
export const WAREHOUSES=['Bodega A','Bodega B'];
const homeOf=a=>WAREHOUSES.includes(a.home)?a.home:'Bodega A';
export const defaultCrew=()=>Array.from({length:10},(_,i)=>({id:`TEC-${String(i+1).padStart(2,'0')}`,name:`Técnico ${String(i+1).padStart(2,'0')}`,active:true}));
const codeTaken=(s,code,exceptId=null)=>s.assets.some(a=>a.id!==exceptId&&(a.id===code||a.code===code))||s.kits.some(k=>k.id===code);
const jpeg=(v,max)=>{ok(typeof v==='string'&&v.length<max&&v.startsWith('data:image/jpeg;base64,'),'La foto debe ser JPEG y liviana.');ok(atob(v.slice(23)).startsWith('\xff\xd8\xff'),'Foto inválida.');return v;};
const photos=list=>{if(list==null||list==='')return [];ok(Array.isArray(list)&&list.length<=3,'Agrega hasta 3 fotos por pieza.');return list.map(p=>jpeg(p,90000));};
export const TM_TYPES=['load_in','stage_setup','rigging','pa_setup','lighting_setup','backline_setup','line_check','soundcheck','doors','performance','changeover','stage_reset','curfew','load_out','crew_break','meeting','custom'];
const TM_STATUS=['pending','prep','running','done','late'],TM_EVENT_STATUS=['planning','confirmed','live','done','cancelled'];
const stagesOf=e=>e.stages?.length?e.stages:[{id:'S1',name:'Escenario principal'}];
const dtOk=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
const crewOf=s=>Array.isArray(s.crew)&&s.crew.length?s.crew:defaultCrew();
const crewName=(s,id)=>{const t=crewOf(s).find(t=>t.id===id&&t.active!==false);ok(t,'Elige el técnico responsable.');return t.name;};
export function demoSeed(){
  const s=structuredClone(seed),local=(days,hour)=>{const d=new Date();d.setDate(d.getDate()+days);d.setHours(hour,0,0,0);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
  s.events[0].start=local(1,9);s.events[0].end=local(2,12);s.events[1].start=local(0,10);s.events[1].end=local(1,11);s.movements[0].at=new Date().toISOString();return s;
}
export function applyDemoCommand(source,cmd){
  const s=structuredClone(source),asset=id=>find(s.assets,id),kit=id=>find(s.kits,id),event=id=>find(s.events,id);
  let ids=[],eventId=null,summary='',note='',by=null;
  switch(cmd.type){
    case 'create_asset':{
      const code=text(cmd.code,60).toUpperCase(),name=text(cmd.name),category=text(cmd.category||'Accesorios',60),warehouse=text(cmd.location||'Bodega A',120);ok(WAREHOUSES.includes(warehouse),'Elige Bodega A o Bodega B.');
      ok(/^[A-Z0-9][A-Z0-9_-]{2,59}$/.test(code),'Código inválido.');ok(!codeTaken(s,code),'Ese código ya existe.');ok(name,'Escribe el nombre del equipo.');
      ok(['Tambores','Platillos','Fierros','Accesorios','Gabinetes','Cabezales','Micrófonos','Cables','Cases'].includes(category),'Categoría inválida.');
      s.assets.push({id:code,code,name,category,brand:text(cmd.brand,80),model:text(cmd.model,100),location:warehouse,home:warehouse,serial:text(cmd.serial,100),kitId:null,status:'available',condition:'ok',eventId:null,note:'',photos:photos(cmd.photos)});
      ids=[code];summary='Equipo incorporado: '+name;break;
    }
    case 'asset_photos':{const a=asset(cmd.assetId);a.photos=photos(cmd.photos);ids=[a.id];summary='Fotos actualizadas: '+a.name;break;}
    case 'asset_update':{const a=asset(cmd.assetId),name=text(cmd.name),category=text(cmd.category||a.category,60),oldCode=a.code||a.id,newCode=cmd.code?text(cmd.code,60).toUpperCase():oldCode;if(newCode!==oldCode){ok(/^[A-Z0-9][A-Z0-9_-]{2,59}$/.test(newCode),'Usa un código de 3 a 60 letras, números o guiones.');ok(!codeTaken(s,newCode,a.id),'Ese código ya lo usa otro equipo o kit.');}a.code=newCode;ok(name,'Escribe el nombre del equipo.');ok(['Tambores','Platillos','Fierros','Accesorios','Gabinetes','Cabezales','Micrófonos','Cables','Cases'].includes(category),'Categoría inválida.');Object.assign(a,{name,category,brand:text(cmd.brand,80),model:text(cmd.model,100),serial:text(cmd.serial,100),note:text(cmd.note,500)});ids=[a.id];summary='Detalle actualizado: '+name;break;}
    case 'crew_profile':{const crew=structuredClone(crewOf(s)),t=crew.find(t=>t.id===cmd.crewId),name=text(cmd.name,80),email=text(cmd.email||'',190).toLowerCase();ok(t,'Técnico no encontrado.');ok(name,'Escribe el nombre del técnico.');ok(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Revisa el email del técnico.');ok(!crew.some(x=>x.id!==t.id&&x.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')),'Ya hay un técnico con ese nombre.');Object.assign(t,{name,email,phone:phone(cmd.phone||'')});if('photo' in cmd)t.photo=cmd.photo?jpeg(cmd.photo,90000):'';s.crew=crew;summary='Perfil de técnico actualizado: '+name;break;}
    case 'create_kit':{
      ids=selected(cmd);const name=text(cmd.name);ok(name,'Escribe el nombre del kit.');const kitId=uid('KIT'),locations=[];
      for(const id of ids){const a=asset(id);ok(a.status==='available','Solo puedes agrupar equipos disponibles.');for(const k of s.kits)if(k.id===a.kitId)k.assembled=false;a.kitId=kitId;locations.push(a.location);}
      s.kits.push({id:kitId,name,brand:text(cmd.brand,80),finish:text(cmd.finish,120),assembled:new Set(locations).size===1,expectedIds:[...ids],note:'Kit creado en bodega.'});summary='Nuevo kit: '+name;break;
    }
    case 'kit_mode':{
      const k=kit(cmd.kitId),parts=s.assets.filter(a=>a.kitId===k.id),assembled=cmd.assembled===true;
      if(assembled){ok(parts.length>0&&k.expectedIds.every(id=>parts.some(a=>a.id===id)),'Faltan componentes originales para completar este kit.');ok(parts.every(isAvailable),'No puedes armar un kit con piezas reservadas, fuera o dañadas.');ok(new Set(parts.map(a=>a.location)).size===1,'Todas las piezas deben estar en la misma ubicación.');}
      k.assembled=assembled;ids=parts.map(a=>a.id);summary=(assembled?'Kit armado: ':'Kit separado en componentes: ')+k.name;break;
    }
    case 'assign_kit':{
      const a=asset(cmd.assetId),target=cmd.kitId||null;ok(a.status==='available','Solo puedes reasignar piezas disponibles.');if(target)kit(target);
      for(const k of s.kits)if(k.id===a.kitId||k.id===target)k.assembled=false;a.kitId=target;ids=[a.id];summary='Agrupación actualizada: '+a.name;break;
    }
    case 'create_event':case 'reserve':{
      ids=selected(cmd);for(const id of ids){const a=asset(id);ok(isAvailable(a),a.name+' ya está reservado, fuera o en revisión.');}
      let e;
      if(cmd.type==='create_event'){
        const name=text(cmd.name),place=text(cmd.place,200),responsible=text(cmd.responsible,120),start=text(cmd.start,30),end=text(cmd.end,30);
        ok(name&&place&&responsible,'Completa evento, destino y responsable.');ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)&&Number.isFinite(Date.parse(start))&&Date.parse(end)>Date.parse(start),'La devolución debe ser posterior a la salida.');
        eventId=uid('EVT');e={id:eventId,name,place,responsible,start,end,vehicle:text(cmd.vehicle,120),driver:text(cmd.driver||'',120),responsiblePhone:phone(cmd.responsiblePhone),driverPhone:phone(cmd.driverPhone),service:text(cmd.service||'Backline',80),poster:cmd.poster?jpeg(cmd.poster,260000):'',items:[]};s.events.push(e);
      }else{eventId=cmd.eventId;e=event(eventId);ok(Date.parse(e.end)>Date.now(),'Este evento ya terminó.');}
      for(const id of ids){const a=asset(id);a.status='reserved';a.eventId=eventId;e.items.push({assetId:id,status:'reserved',condition:'ok',note:''});}
      summary=ids.length+' equipos reservados para '+e.name;break;
    }
    case 'dispatch':case 'release':case 'return':{
      eventId=cmd.eventId;const e=event(eventId);ids=selected(cmd);const condition=cmd.condition||'ok';note=text(cmd.note,1500);
      ok(['ok','damage','missing'].includes(condition),'Estado de devolución inválido.');by=cmd.type==='release'?null:crewName(s,cmd.responsibleId);if(cmd.type==='return'&&condition!=='ok')ok(note.length>=3,'Describe el daño o faltante.');
      for(const id of ids){const a=asset(id),it=e.items.find(i=>i.assetId===id&&['reserved','out','missing'].includes(i.status));ok(it&&a.eventId===eventId,'El equipo no está asignado activamente a este evento.');
        if(cmd.type==='dispatch'||cmd.type==='release'){
          ok(a.status==='reserved'&&it.status==='reserved','Solo puedes sacar o liberar equipos reservados.');a.status=cmd.type==='dispatch'?'out':'available';it.status=cmd.type==='dispatch'?'out':'released';
          if(cmd.type==='release')a.eventId=null;else{a.location=e.place;it.outBy=by;}
        }else{
          ok(['out','missing'].includes(a.status)&&['out','missing'].includes(it.status),'El equipo aún no ha salido o ya fue devuelto.');
          a.status=condition==='damage'?'maintenance':condition==='missing'?'missing':'available';a.condition=condition==='missing'?'review':condition;
          if(condition!=='missing')a.location=condition==='damage'?'Taller':homeOf(a);a.eventId=condition==='missing'?eventId:null;a.note=note;
          it.status=condition==='missing'?'missing':'returned';it.condition=condition;it.note=note;it.inBy=by;
        }
      }
      summary=(cmd.type==='dispatch'?'Salida registrada':cmd.type==='release'?'Reserva liberada':condition==='missing'?'Faltante reportado':'Devolución registrada')+': '+ids.length+' piezas · '+e.name+(by?' · Responsable: '+by:'');break;
    }
    case 'maintenance':{
      ids=selected(cmd);const ready=cmd.ready===true;note=text(cmd.note,1500);
      for(const id of ids){const a=asset(id);ok(ready?a.status==='maintenance':a.status==='available','El equipo no admite ese cambio de mantenimiento.');a.status=ready?'available':'maintenance';a.condition=ready?'ok':'review';a.location=ready?homeOf(a):'Taller';a.note=note;}
      summary=ready?'Revisión técnica completada':'Equipos enviados a mantenimiento';break;
    }
    case 'event_poster':{const e=event(cmd.eventId);eventId=e.id;e.poster=cmd.poster?jpeg(cmd.poster,260000):'';summary=(e.poster?'Afiche actualizado: ':'Afiche quitado: ')+e.name;break;}
    case 'event_update':{
      const e=event(cmd.eventId);eventId=e.id;const status=cmd.status||e.status||'planning';ok(TM_EVENT_STATUS.includes(status),'Estado de evento inválido.');
      const sm=text(cmd.stageManagerId||'',20);if(sm)crewName(s,sm);const raw=cmd.stages||stagesOf(e);ok(Array.isArray(raw)&&raw.length>=1&&raw.length<=8,'Define entre 1 y 8 escenarios.');
      const seen=new Set(),stages=raw.map(st=>{const id=text(st?.id||'',4),name=text(st?.name||'',60);ok(/^S[0-9]{1,2}$/.test(id)&&!seen.has(id)&&name,'Revisa los nombres de los escenarios.');seen.add(id);return {id,name};});
      for(const a of e.timing||[])ok(seen.has(a.stageId),'Hay actividades en un escenario que quieres quitar. Muévelas antes.');
      Object.assign(e,{client:text(cmd.client||'',160),address:text(cmd.address||'',200),status,stageManagerId:sm,stages,notes:text(cmd.notes||'',3000)});summary='Datos del evento actualizados: '+e.name;break;
    }
    case 'timing_save':{
      const e=event(cmd.eventId);eventId=e.id;const acts=cmd.activities;ok(Array.isArray(acts)&&acts.length<=200,'El cronograma admite hasta 200 actividades.');
      const stageIds=stagesOf(e).map(x=>x.id),prev=Object.fromEntries((e.timing||[]).map(a=>[a.id,a])),seen=new Set();
      const out=acts.map(a=>{ok(a&&typeof a==='object','Actividad inválida.');const id=text(a.id||'',16);ok(/^A[0-9A-Z]{2,14}$/.test(id)&&!seen.has(id),'Identificador de actividad inválido.');seen.add(id);
        ok(TM_TYPES.includes(a.type),'Tipo de actividad inválido.');const title=text(a.title||'',120);ok(title,'Cada actividad necesita un nombre.');ok(stageIds.includes(a.stageId),'Escenario inválido en «'+title+'».');
        ok(dtOk(a.start)&&dtOk(a.end),'Revisa las horas de «'+title+'».');const mins=(Date.parse(a.end)-Date.parse(a.start))/60000;ok(mins>0&&mins<=1440,'«'+title+'» debe terminar después de empezar (máximo 24 h).');
        const resp=text(a.responsibleId||'',20);if(resp)crewName(s,resp);const status=a.status||'pending';ok(TM_STATUS.includes(status),'Estado de actividad inválido.');
        return {id,type:a.type,title,stageId:a.stageId,start:a.start,end:a.end,responsibleId:resp,artist:text(a.artist||'',120),description:text(a.description||'',1000),status,actualStart:prev[id]?.actualStart??null,actualEnd:prev[id]?.actualEnd??null};});
      out.sort((x,y)=>x.start.localeCompare(y.start)||x.end.localeCompare(y.end));e.timing=out;summary='Run of Show actualizado: '+out.length+' actividades · '+e.name;break;
    }
    case 'crew_add':{const crew=structuredClone(crewOf(s)),name=text(cmd.name,80);ok(name,'Escribe el nombre del técnico.');const low=name.toLocaleLowerCase('es'),same=crew.find(t=>t.name.toLocaleLowerCase('es')===low);ok(!same||same.active===false,'Ya hay un técnico con ese nombre.');ok(crew.filter(t=>t.active!==false).length<60,'Llegaste al máximo de 60 técnicos.');
      if(same){same.active=true;same.name=name;summary='Técnico reincorporado: '+name;}else{const max=Math.max(0,...crew.map(t=>+(/^TEC-(\d+)$/.exec(t.id)||[])[1]||0));crew.push({id:'TEC-'+String(max+1).padStart(2,'0'),name,active:true});summary='Técnico agregado: '+name;}s.crew=crew;break;}
    case 'crew_remove':{const crew=structuredClone(crewOf(s)),t=crew.find(t=>t.id===cmd.crewId&&t.active!==false);ok(t,'Técnico no encontrado.');t.active=false;ok(crew.some(x=>x.active!==false),'Debe quedar al menos un técnico.');s.crew=crew;summary='Técnico eliminado: '+t.name;break;}
    case 'crew_rename':{
      const crew=structuredClone(crewOf(s)),name=text(cmd.name,80),t=crew.find(t=>t.id===cmd.crewId);ok(name,'Escribe el nombre del técnico.');ok(t,'Técnico no encontrado.');
      ok(!crew.some(x=>x.id!==t.id&&x.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')),'Ya hay un técnico con ese nombre.');t.name=name;s.crew=crew;summary='Equipo técnico actualizado: '+name;break;
    }
    case 'crew_photo':{const crew=structuredClone(crewOf(s)),t=crew.find(t=>t.id===cmd.crewId);ok(t,'Técnico no encontrado.');t.photo=cmd.photo?jpeg(cmd.photo,90000):'';s.crew=crew;summary='Foto de técnico actualizada: '+t.name;break;}
    case 'report_issue':{
      ids=selected(cmd);ok(ids.length<=60,'Reporta hasta 60 piezas por informe.');const kind=cmd.kind;ok(['damage','missing'].includes(kind),'Elige si es daño o faltante.');note=text(cmd.note,1500);ok(note.length>=3,'Describe el daño o faltante.');by=crewName(s,cmd.responsibleId);
      const photo=cmd.photo?jpeg(cmd.photo,200000):'';let issueEvent=null;
      for(const id of ids){const a=asset(id);issueEvent=issueEvent??a.eventId;if(a.status==='available'){if(kind==='damage'){a.status='maintenance';a.condition='damage';a.location='Taller';}else{a.status='missing';a.condition='review';}}a.note=(kind==='damage'?'Daño: ':'Faltante: ')+note;}
      const issueId=uid('INF');eventId=issueEvent;s.issues=s.issues||[];s.issues.unshift({id:issueId,at:new Date().toISOString(),kind,assetIds:ids,note,photo,by,byId:cmd.responsibleId,eventId:issueEvent,status:'open',actor:'Operador demo'});
      summary=(kind==='damage'?'Informe de daño ':'Informe de faltante ')+issueId+': '+ids.length+' piezas · Responsable: '+by;break;
    }
    case 'issue_close':{s.issues=s.issues||[];const i=find(s.issues,cmd.issueId);ok(i.status==='open','El informe ya está cerrado.');i.status='closed';i.closedAt=new Date().toISOString();i.closedBy='Operador demo';i.resolution=text(cmd.note||'',500);ids=i.assetIds;summary='Informe cerrado: '+i.id;break;}
    case 'transfer':{
      ids=selected(cmd);const to=text(cmd.warehouse,40);note=text(cmd.note||'',500);ok(WAREHOUSES.includes(to),'Elige Bodega A o Bodega B.');
      for(const id of ids){const a=asset(id);ok(isAvailable(a),a.name+' no está disponible en bodega; no se puede trasladar.');a.location=to;a.home=to;}
      summary='Traslado a '+to+': '+ids.length+' piezas';break;
    }
    default:throw new Error('Operación no válida.');
  }
  for(const k of s.kits){const parts=s.assets.filter(a=>a.kitId===k.id);if(!k.expectedIds.every(id=>parts.some(a=>a.id===id))||new Set(parts.map(a=>a.status)).size!==1||new Set(parts.map(a=>a.location)).size!==1||parts.some(a=>a.condition!=='ok'))k.assembled=false;}
  if(!Array.isArray(s.crew))s.crew=defaultCrew();
  const movement={id:uid('MOV'),at:new Date().toISOString(),type:cmd.type,summary,assetIds:ids,actor:'Operador demo',eventId,note,responsible:by};
  if(cmd.type==='return'&&cmd.photo){ok(typeof cmd.photo==='string'&&cmd.photo.length<200000&&cmd.photo.startsWith('data:image/jpeg;base64,'),'La foto debe ser JPEG y pesar menos de 150 KB.');const bytes=atob(cmd.photo.slice(23));ok(bytes.startsWith('\xff\xd8\xff'),'Foto inválida.');movement.photo=cmd.photo;}
  s.movements.unshift(movement);s.revision++;return s;
}
export async function handleDemoApi(action,payload){
  if(action==='bootstrap')return {mode:'demo',state:demoSeed(),csrf:'demo',user:{id:'demo',name:'Operador demo',role:'admin'}};
  if(action==='command')return {state:applyDemoCommand(payload.state,payload.command)};
  throw new Error('Esta acción requiere la instalación PHP + SQL.');
}
