const KEY='kb-guided-tour-v1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const check='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';

export function createGuidedTour({getState,getMode=()=> 'demo',onStart=()=>{},onEnd=()=>{}}){
  let root=null,index=0,steps=[],origin=null,target=null,frame=0,invitation=null,offered=false,previousInert=false;
  const read=()=>{try{return localStorage.getItem(KEY);}catch{return null;}};
  const save=status=>{try{localStorage.setItem(KEY,JSON.stringify({status,at:new Date().toISOString()}));}catch{}};
  const active=()=>Boolean(root);
  const build=()=>{
    const state=getState(),kit=state.kits[0],event=state.events.find(e=>e.items.some(i=>['reserved','out','missing'].includes(i.status)))||state.events[0];
    return [
      {route:'dashboard',target:'.operations-hero',title:'Bienvenido a la bodega',text:'Este recorrido te muestra cómo controlar el backline, desde la reserva hasta el retorno. Solo visitaremos pantallas: el tour no mueve ni modifica equipos.',hint:'Puedes salir cuando quieras. Tu selección se conserva.'},
      {route:'dashboard',target:'.metrics',title:'El estado de un vistazo',text:'Estos contadores muestran equipos reales de tu inventario: disponibles, en eventos y en reparación. Cada tambor y cada fierro se cuenta una sola vez, aunque pertenezca a un kit.'},
      {route:'inventory',target:'.inventory-toolbar',title:'Encuentra cualquier equipo',text:'Busca por nombre, código, marca o modelo. Combina la búsqueda con categoría y estado; las pestañas muestran cuántas piezas hay en cada situación.'},
      {route:'inventory',target:'.inventory-panel',title:'Una identidad por pieza',text:'Cada fila tiene código, estado, ubicación, evento y kit. Marca piezas disponibles para preparar una salida. El botón QR abre su etiqueta para imprimirla.',hint:'Reservar una pieza la bloquea para otros eventos; todavía no registra su salida física.'},
      ...(kit?[
        {route:'kit/'+kit.id,target:'.kit-components',title:'Kit completo o por componentes',text:'En Vista kit puedes preparar el conjunto. En Vista componentes eliges solo un bombo, un tom o los fierros que necesitas. Cada pieza conserva su código, ubicación e historial.'},
        {route:'kit/'+kit.id,target:'.kit-logistics',title:'Prepara la carga exacta',text:'Elige el evento de destino y reserva la selección desde este panel. Lo que no seleccionas permanece en bodega. Puedes desarmar y reagrupar kits; rearmarlos requiere sus piezas originales disponibles.'}
      ]:[{route:'kits',target:'.page-heading',title:'Agrupa equipos en kits',text:'Un kit reúne piezas que ya existen en inventario. No crea stock adicional. Al incorporar equipos podrás preparar conjuntos completos o componentes por separado.'}]),
      {route:'events',target:'.page-heading',title:'Cada salida tiene un responsable',text:'Los eventos reúnen destino, fechas, responsable, transporte y equipos. Nueva salida te lleva a seleccionar piezas y preparar su reserva.'},
      ...(event?[
        {route:'event/'+event.id,target:'.event-tabs',title:'La ficha de cada evento',text:'Equipos muestra la carga y sus estados. Detalles reúne las fechas y el destino; Personal muestra el responsable y transporte; Notas conserva los movimientos de esa salida.'},
        {route:'event/'+event.id,target:'.event-action-bar',title:'Salida y devolución son pasos distintos',text:'Selecciona las piezas reservadas y usa Registrar salida cuando se carguen físicamente. Al regreso, marca solo las que recibes y usa Registrar devolución.',hint:'Una devolución puede ser parcial, con daño o con faltantes. Los faltantes siguen pendientes hasta recuperarlos.'}
      ]:[]),
      {route:'scan',target:'.scanner-console',title:'Escanea y verifica',text:'Activa la cámara para leer una etiqueta QR. También puedes cargar una imagen o escribir el código. Verás la ficha y el estado antes de continuar.',hint:'La cámara solo se activa cuando tú pulsas Activar cámara.'},
      {route:'maintenance',target:'.page-heading',title:'Revisión y recuperación',text:'Aquí aparecen daños y faltantes. Un equipo dañado vuelve a estar disponible cuando se confirma su revisión; un faltante se recupera desde la devolución del evento.'},
      {route:'reports',target:'.report-grid',title:'El historial queda registrado',text:'Consulta quién hizo cada movimiento y cuándo. Puedes exportar el inventario en CSV y descargar un respaldo completo desde Ajustes.'},
      {route:'dashboard',target:'.operations-hero',title:'Listo para preparar tu próxima salida',text:'El flujo es: elegir piezas, reservar, confirmar la salida y conciliar la devolución. Puedes repetir este recorrido desde Ayuda o Ajustes.',hint:getMode()==='demo'?'La demo usa datos ficticios guardados en este navegador. En la instalación SQL, los encargados compartirán la misma bodega.':'Los movimientos se confirman en SQL y se comparten entre los encargados de tu bodega.',last:true}
    ];
  };
  function dismissInvitation(){invitation?.remove();invitation=null;save('dismissed');}
  function offer(){
    if(offered||read()||root)return;offered=true;
    invitation=document.createElement('aside');invitation.className='tour-invitation';invitation.setAttribute('aria-label','Bienvenida y tour guiado');
    invitation.innerHTML=`<button class="tour-invite-close" aria-label="Cerrar invitación al tour">×</button><span class="tour-invite-icon">?</span><div><strong>Conoce tu nueva bodega.</strong><p>Un recorrido de 2 minutos para aprender a reservar, escanear y mover equipos.</p><div class="tour-invite-actions"><button class="btn primary" data-invite-start>Iniciar tour</button><button class="btn ghost" data-invite-later>Más tarde</button></div></div>`;
    invitation.querySelector('[data-invite-start]').addEventListener('click',start);
    invitation.querySelector('[data-invite-later]').addEventListener('click',dismissInvitation);
    invitation.querySelector('.tour-invite-close').addEventListener('click',dismissInvitation);
    document.body.append(invitation);
  }
  function start(){
    if(root)return;invitation?.remove();invitation=null;
    origin={hash:location.hash||'#dashboard',scroll:window.scrollY,focus:document.activeElement};
    onStart();steps=build();index=0;
    root=document.createElement('div');root.className='guided-tour';root.setAttribute('role','presentation');
    root.innerHTML='<div class="tour-scrim tour-scrim-top"></div><div class="tour-scrim tour-scrim-left"></div><div class="tour-scrim tour-scrim-right"></div><div class="tour-scrim tour-scrim-bottom"></div><div class="tour-spotlight" aria-hidden="true"></div><section class="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourText"></section>';
    document.body.append(root);previousInert=document.querySelector('#app').inert;document.querySelector('#app').inert=true;
    document.body.classList.add('tour-open');document.addEventListener('keydown',keyboard,true);window.addEventListener('resize',position);window.addEventListener('scroll',position,{passive:true});
    visit();
  }
  function visit(){
    const step=steps[index];target=null;root.querySelector('.tour-dialog').innerHTML=`<div class="tour-step-label">RECORRIDO DE BODEGA <span>${index+1} / ${steps.length}</span></div><button class="tour-close" aria-label="Cerrar tour">×</button><div class="tour-meter"><span style="width:${(index+1)/steps.length*100}%"></span></div>${step.last?`<div class="tour-complete-icon">${check}</div>`:''}<h2 id="tourTitle">${escape(step.title)}</h2><p id="tourText">${escape(step.text)}</p>${step.hint?`<div class="tour-hint">${escape(step.hint)}</div>`:''}<div class="tour-navigation"><button class="btn ghost tour-skip">Salir del tour</button><div><button class="btn tour-prev" ${index===0?'disabled':''}>Atrás</button><button class="btn primary tour-next">${step.last?'Terminar':'Siguiente'} ${step.last?'✓':'→'}</button></div></div>`;
    root.querySelector('.tour-close').addEventListener('click',()=>finish(false));root.querySelector('.tour-skip').addEventListener('click',()=>finish(false));root.querySelector('.tour-prev').addEventListener('click',()=>move(-1));root.querySelector('.tour-next').addEventListener('click',()=>step.last?finish(true):move(1));
    if(location.hash!=='#'+step.route)location.hash=step.route;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!root)return;
      target=document.querySelector(step.target);target?.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});
      position();root.querySelector('.tour-next').focus({preventScroll:true});
    }));
  }
  function position(){
    if(!root)return;const w=document.documentElement.clientWidth,h=window.innerHeight,gap=12,pad=7,card=root.querySelector('.tour-dialog');
    const box=target?.getBoundingClientRect();
    const rect=box?{left:Math.max(8,box.left-pad),top:Math.max(8,box.top-pad),right:Math.min(w-8,box.right+pad),bottom:Math.min(h-8,box.bottom+pad)}:{left:8,top:8,right:w-8,bottom:h-8};
    rect.right=Math.max(rect.left,rect.right);rect.bottom=Math.max(rect.top,rect.bottom);
    const apply=(selector,styles)=>Object.assign(root.querySelector(selector).style,styles);
    apply('.tour-spotlight',{left:rect.left+'px',top:rect.top+'px',width:(rect.right-rect.left)+'px',height:(rect.bottom-rect.top)+'px'});
    apply('.tour-scrim-top',{left:0,top:0,width:w+'px',height:rect.top+'px'});
    apply('.tour-scrim-bottom',{left:0,top:rect.bottom+'px',width:w+'px',height:(h-rect.bottom)+'px'});
    apply('.tour-scrim-left',{left:0,top:rect.top+'px',width:rect.left+'px',height:(rect.bottom-rect.top)+'px'});
    apply('.tour-scrim-right',{left:rect.right+'px',top:rect.top+'px',width:(w-rect.right)+'px',height:(rect.bottom-rect.top)+'px'});
    const cw=Math.min(400,w-24);card.style.width=cw+'px';card.style.maxHeight=(h-32)+'px';
    const ch=card.getBoundingClientRect().height;
    let left=Math.min(w-cw-12,Math.max(12,rect.left)),top;
    if(rect.bottom+gap+ch<h-12)top=rect.bottom+gap;
    else if(rect.top-gap-ch>12)top=rect.top-gap-ch;
    else if(rect.right+gap+cw<w-12){left=rect.right+gap;top=Math.max(12,Math.min(h-ch-12,rect.top));}
    else if(rect.left-gap-cw>12){left=rect.left-gap-cw;top=Math.max(12,Math.min(h-ch-12,rect.top));}
    else{top=Math.max(12,h-ch-18);root.classList.add('tour-overlap');}
    card.style.left=left+'px';card.style.top=top+'px';
  }
  function move(delta){index=Math.max(0,Math.min(steps.length-1,index+delta));visit();}
  function keyboard(e){
    if(!root)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false);return;}
    if(e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();if(index===steps.length-1)finish(true);else move(1);return;}
    if(e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();move(-1);return;}
    if(e.key==='Tab'){
      const buttons=[...root.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  }
  function finish(completed){
    cancelAnimationFrame(frame);root?.remove();root=null;target=null;
    document.querySelector('#app').inert=previousInert;document.body.classList.remove('tour-open');
    document.removeEventListener('keydown',keyboard,true);window.removeEventListener('resize',position);window.removeEventListener('scroll',position);save(completed?'completed':'dismissed');
    const saved=origin;
    const restore=()=>requestAnimationFrame(()=>{onEnd();window.scrollTo({top:saved.scroll,behavior:'instant'});const focus=saved.focus?.isConnected?saved.focus:document.querySelector('[data-action="tour-help"]');focus?.focus({preventScroll:true});});
    if(location.hash!==saved.hash){window.addEventListener('hashchange',restore,{once:true});location.hash=saved.hash;}else restore();
  }
  return {start,offer,isActive:active};
}
