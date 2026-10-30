// Browser-only simulator for the temporary static demo. PHP remains authoritative
// in the real installation. This module contains no SQL credentials or user data.
import seed from './demo-seed.json' with {type:'json'};
const ok=(condition,message)=>{if(!condition)throw new Error(message);};
const text=(value='',max=180)=>{ok(typeof value==='string'&&value.trim().length<=max,'Texto inválido o demasiado largo.');return value.trim();};
const find=(list,id)=>{const result=list.find(v=>v.id===id);ok(result,'No se encontró el registro: '+id);return result;};
const selected=cmd=>{const ids=cmd.assetIds;ok(Array.isArray(ids)&&ids.length>0&&ids.length<=500,'Selecciona al menos un equipo.');ok(ids.every(id=>typeof id==='string'&&id.length<100)&&new Set(ids).size===ids.length,'La selección tiene códigos inválidos o repetidos.');return ids;};
const uid=prefix=>prefix+'-'+crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
const isAvailable=a=>a.status==='available'&&a.condition==='ok';
export function demoSeed(){
  const s=structuredClone(seed),local=(days,hour)=>{const d=new Date();d.setDate(d.getDate()+days);d.setHours(hour,0,0,0);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
  s.events[0].start=local(1,9);s.events[0].end=local(2,12);s.events[1].start=local(0,10);s.events[1].end=local(1,11);s.movements[0].at=new Date().toISOString();return s;
}
export function applyDemoCommand(source,cmd){
  const s=structuredClone(source),asset=id=>find(s.assets,id),kit=id=>find(s.kits,id),event=id=>find(s.events,id);
  let ids=[],eventId=null,summary='',note='';
  switch(cmd.type){
    case 'create_asset':{
      const code=text(cmd.code,60).toUpperCase(),name=text(cmd.name),category=text(cmd.category||'Accesorios',60);
      ok(/^[A-Z0-9][A-Z0-9_-]{2,59}$/.test(code),'Código inválido.');ok(!s.assets.some(a=>a.code===code),'Ese código ya existe.');ok(name,'Escribe el nombre del equipo.');
      ok(['Tambores','Fierros','Accesorios','Gabinetes','Cabezales','Micrófonos','Cables','Cases'].includes(category),'Categoría inválida.');
      s.assets.push({id:code,code,name,category,brand:text(cmd.brand,80),model:text(cmd.model,100),location:text(cmd.location||'Bodega A',120),serial:text(cmd.serial,100),kitId:null,status:'available',condition:'ok',eventId:null,note:''});
      ids=[code];summary='Equipo incorporado: '+name;break;
    }
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
        eventId=uid('EVT');e={id:eventId,name,place,responsible,start,end,vehicle:text(cmd.vehicle,120),service:text(cmd.service||'Backline',80),items:[]};s.events.push(e);
      }else{eventId=cmd.eventId;e=event(eventId);ok(Date.parse(e.end)>Date.now(),'Este evento ya terminó.');}
      for(const id of ids){const a=asset(id);a.status='reserved';a.eventId=eventId;e.items.push({assetId:id,status:'reserved',condition:'ok',note:''});}
      summary=ids.length+' equipos reservados para '+e.name;break;
    }
    case 'dispatch':case 'release':case 'return':{
      eventId=cmd.eventId;const e=event(eventId);ids=selected(cmd);const condition=cmd.condition||'ok';note=text(cmd.note,1500);
      ok(['ok','damage','missing'].includes(condition),'Estado de devolución inválido.');if(cmd.type==='return'&&condition!=='ok')ok(note.length>=3,'Describe el daño o faltante.');
      for(const id of ids){const a=asset(id),it=e.items.find(i=>i.assetId===id&&['reserved','out','missing'].includes(i.status));ok(it&&a.eventId===eventId,'El equipo no está asignado activamente a este evento.');
        if(cmd.type==='dispatch'||cmd.type==='release'){
          ok(a.status==='reserved'&&it.status==='reserved','Solo puedes sacar o liberar equipos reservados.');a.status=cmd.type==='dispatch'?'out':'available';it.status=cmd.type==='dispatch'?'out':'released';
          if(cmd.type==='release')a.eventId=null;else a.location=e.place;
        }else{
          ok(['out','missing'].includes(a.status)&&['out','missing'].includes(it.status),'El equipo aún no ha salido o ya fue devuelto.');
          a.status=condition==='damage'?'maintenance':condition==='missing'?'missing':'available';a.condition=condition==='missing'?'review':condition;
          if(condition!=='missing')a.location=condition==='damage'?'Taller':'Bodega A';a.eventId=condition==='missing'?eventId:null;a.note=note;
          it.status=condition==='missing'?'missing':'returned';it.condition=condition;it.note=note;
        }
      }
      summary=(cmd.type==='dispatch'?'Salida registrada':cmd.type==='release'?'Reserva liberada':condition==='missing'?'Faltante reportado':'Devolución registrada')+': '+ids.length+' piezas · '+e.name;break;
    }
    case 'maintenance':{
      ids=selected(cmd);const ready=cmd.ready===true;note=text(cmd.note,1500);
      for(const id of ids){const a=asset(id);ok(ready?a.status==='maintenance':a.status==='available','El equipo no admite ese cambio de mantenimiento.');a.status=ready?'available':'maintenance';a.condition=ready?'ok':'review';a.location=ready?'Bodega A':'Taller';a.note=note;}
      summary=ready?'Revisión técnica completada':'Equipos enviados a mantenimiento';break;
    }
    default:throw new Error('Operación no válida.');
  }
  for(const k of s.kits){const parts=s.assets.filter(a=>a.kitId===k.id);if(!k.expectedIds.every(id=>parts.some(a=>a.id===id))||new Set(parts.map(a=>a.status)).size!==1||new Set(parts.map(a=>a.location)).size!==1||parts.some(a=>a.condition!=='ok'))k.assembled=false;}
  const movement={id:uid('MOV'),at:new Date().toISOString(),type:cmd.type,summary,assetIds:ids,actor:'Operador demo',eventId,note};
  if(cmd.type==='return'&&cmd.photo){ok(typeof cmd.photo==='string'&&cmd.photo.length<200000&&cmd.photo.startsWith('data:image/jpeg;base64,'),'La foto debe ser JPEG y pesar menos de 150 KB.');const bytes=atob(cmd.photo.slice(23));ok(bytes.startsWith('\xff\xd8\xff'),'Foto inválida.');movement.photo=cmd.photo;}
  s.movements.unshift(movement);s.revision++;return s;
}
export async function handleDemoApi(action,payload){
  if(action==='bootstrap')return {mode:'demo',state:demoSeed(),csrf:'demo',user:{id:'demo',name:'Operador demo',role:'admin'}};
  if(action==='command')return {state:applyDemoCommand(payload.state,payload.command)};
  throw new Error('Esta acción requiere la instalación PHP + SQL.');
}
