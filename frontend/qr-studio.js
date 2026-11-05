// Centro de etiquetas QR (Ajustes → Etiquetas QR, ruta #qr).
// Tres modos: varias piezas, una sola (con copias) o un QR libre (texto o enlace).
// Papel libre (A4, Carta, Oficio), rollo de impresora térmica u hojas de etiquetas precortadas.
// Las medidas se trabajan en milímetros: la vista previa y la impresión usan el mismo dibujo.
import QRCode from 'qrcode';

const OPTS_KEY = 'kb-qr-opts';
const PAPERS = {
  a4:     {name:'A4 (210 × 297 mm)', w:210, h:297, free:true},
  letter: {name:'Carta (216 × 279 mm)', w:215.9, h:279.4, free:true},
  oficio: {name:'Oficio (216 × 330 mm)', w:216, h:330, free:true},
  roll:   {name:'Rollo de etiquetas (impresora térmica)', roll:true},
  l7160:  {name:'Hoja A4 · 21 etiquetas 63,5 × 38,1 mm', w:210, h:297, cols:3, rows:7, lw:63.5, lh:38.1, top:15.15, left:7.25, gx:2.5, gy:0},
  l3474:  {name:'Hoja A4 · 24 etiquetas 70 × 37 mm', w:210, h:297, cols:3, rows:8, lw:70, lh:37, top:0.5, left:0, gx:0, gy:0},
  l7163:  {name:'Hoja A4 · 14 etiquetas 99,1 × 38,1 mm', w:210, h:297, cols:2, rows:7, lw:99.1, lh:38.1, top:15.15, left:4.65, gx:2.5, gy:0},
  l7651:  {name:'Hoja A4 · 65 etiquetas 38,1 × 21,2 mm', w:210, h:297, cols:5, rows:13, lw:38.1, lh:21.2, top:10.7, left:4.75, gx:2.5, gy:0},
  l5160:  {name:'Hoja Carta · 30 etiquetas 66,7 × 25,4 mm', w:215.9, h:279.4, cols:3, rows:10, lw:66.7, lh:25.4, top:12.7, left:4.8, gx:3.2, gy:0},
};
const SIZES = [
  ['xs','Mini',25,30,'Cables y micrófonos'],
  ['s','Pequeña',38,46,'Accesorios y platillos'],
  ['m','Mediana',50,62,'Tambores, atriles y cases'],
  ['l','Grande',70,88,'Gabinetes y kits'],
  ['w','Apaisada',62,29,'Rollo de 62 mm'],
  ['custom','A medida',0,0,'Tú eliges los milímetros'],
];
const ECC = [['L','Baja','7 %'],['M','Media','15 %'],['Q','Alta','25 %'],['H','Máxima','30 %']];
const FIELDS = [['brand','Marca de la bodega'],['code','Código'],['name','Nombre de la pieza'],['group','Kit o categoría'],['location','Bodega'],['serial','N.º de serie']];
const DEF = {mode:'multi', paper:'a4', size:'m', w:50, h:62, layout:'vertical',
  f:{brand:true, code:true, name:true, group:true, location:false, serial:false},
  brand:'KLANDESTINO · BACKLINE', copies:1, ecc:'M', quiet:1, gap:3, margin:10, cut:true, heads:true, start:1, font:100,
  single:'', freeText:'', freeTitle:''};
const PX = 96/25.4; // px por mm en pantalla
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const num = (v,d) => {const n = parseFloat(String(v).replace(',','.')); return Number.isFinite(n) ? n : d;};
const fmt = n => String(Math.round(n*10)/10).replace('.',',');

export function createQrStudio(ctx) {
  const {esc, icon, toast, byId, kitById, kitParts, labelGroups, heading} = ctx;
  let o = loadOpts();
  let sel = new Set(), open = new Set(), search = '', where = '';
  let timer = 0, token = 0;
  const svgCache = new Map();

  function loadOpts() {
    try {const s = JSON.parse(localStorage.getItem(OPTS_KEY) || 'null'); if (s && typeof s === 'object') return {...DEF, ...s, f:{...DEF.f, ...(s.f||{})}};} catch {}
    return structuredClone(DEF);
  }
  const saveOpts = () => {try {localStorage.setItem(OPTS_KEY, JSON.stringify(o));} catch {}};
  const paper = () => PAPERS[o.paper] || PAPERS.a4;
  const labelSize = () => {const P = paper(); return P.cols ? {w:P.lw, h:P.lh} : {w:clamp(num(o.w,50),10,P.free?P.w-2:200), h:clamp(num(o.h,62),10,P.free?P.h-2:300)};};

  // ── Datos de cada etiqueta ──
  function info(id, g, it) {
    const a = byId(id), k = !a && kitById(id);
    if (!a && !k) return null;
    const parts = k ? kitParts(k.id) : [];
    const group = k ? `Kit completo · ${parts.length} piezas` : g?.id?.startsWith('kit:') ? g.title + (it?.tag ? ' · ' + it.tag : '') : (a.category || '');
    return {key:id, content:'KB:' + id, code:a ? (a.code || id) : id, name:k ? k.name : a.name, group,
      location:a ? (a.location || '') : (parts[0]?.location || ''), serial:a?.serial || ''};
  }
  // Lista ordenada: marcas de grupo ({head}) y etiquetas ({l}).
  function chosen() {
    const copies = clamp(Math.round(num(o.copies,1)),1,200), out = [];
    const push = l => {for (let i = 0; i < copies; i++) out.push({l});};
    if (o.mode === 'free') {
      const t = o.freeText.trim(); if (!t) return out;
      push({key:'free', content:t, code:o.freeTitle.trim(), name:'', group:'', location:'', serial:'', free:true});
      return out;
    }
    if (o.mode === 'single') {
      const g = labelGroups().find(g => g.items.some(i => i.id === o.single));
      const l = info(o.single, g, g?.items.find(i => i.id === o.single)); if (l) push(l);
      return out;
    }
    for (const g of labelGroups()) {
      const items = g.items.filter(i => sel.has(i.id)); if (!items.length) continue;
      out.push({head:g.title, n:items.length * copies});
      for (const it of items) {const l = info(it.id, g, it); if (l) push(l);}
    }
    return out;
  }
  const countLabels = list => list.filter(x => x.l).length;

  // ── Paginación en mm ──
  function paginate(list) {
    const P = paper(), {w, h} = labelSize(), pages = [], labels = list.filter(x => x.l);
    if (P.roll) {for (const x of labels) pages.push({w, h, cells:[{x:0, y:0, w, h, l:x.l}]}); return pages;}
    if (P.cols) {
      const per = P.cols * P.rows; let i = clamp(Math.round(num(o.start,1)),1,per) - 1, page = null;
      for (const x of labels) {
        if (!page || i >= per) {page = {w:P.w, h:P.h, cells:[], sheet:true}; pages.push(page); if (pages.length > 1) i = 0;}
        const c = i % P.cols, r = Math.floor(i / P.cols);
        page.cells.push({x:P.left + c*(P.lw+P.gx), y:P.top + r*(P.lh+P.gy), w, h, l:x.l}); i++;
      }
      return pages;
    }
    const m = clamp(num(o.margin,10),0,40), g = clamp(num(o.gap,3),0,30), HEAD = 7;
    const cols = Math.max(1, Math.floor((P.w - 2*m + g) / (w + g)));
    const x0 = Math.max(m, (P.w - (cols*w + (cols-1)*g)) / 2), maxY = P.h - m;
    let page = null, y = 0, col = 0;
    const newPage = () => {page = {w:P.w, h:P.h, cells:[], heads:[]}; pages.push(page); y = m; col = 0;};
    const heads = o.heads && o.mode === 'multi';
    for (const x of list) {
      if (x.head) {
        if (!heads) continue;
        if (!page) newPage(); else if (col) {y += h + g; col = 0;}
        if (y + HEAD + h > maxY + .01 && page.cells.length) newPage();
        page.heads.push({x:x0, y, text:x.head, n:x.n}); y += HEAD; continue;
      }
      if (!page) newPage();
      if (col >= cols) {y += h + g; col = 0;}
      if (y + h > maxY + .01 && (page.cells.length || page.heads.length)) newPage();
      page.cells.push({x:x0 + col*(w+g), y, w, h, l:x.l}); col++;
    }
    return pages;
  }

  // ── Dibujo de la etiqueta ──
  async function qrSvg(content) {
    const k = o.ecc + '|' + o.quiet + '|' + content;
    if (!svgCache.has(k)) {
      if (svgCache.size > 600) svgCache.clear();
      svgCache.set(k, QRCode.toString(content, {type:'svg', errorCorrectionLevel:o.ecc, margin:clamp(Math.round(num(o.quiet,1)),0,4), color:{dark:'#000000', light:'#ffffff'}}));
    }
    return svgCache.get(k);
  }
  function lines(l) {
    if (o.layout === 'solo') return {top:[], bottom:[]};
    const f = o.f, meta = [f.location && l.location, f.serial && l.serial && 'S/N ' + l.serial].filter(Boolean).join(' · ');
    const bottom = [];
    if (l.free) {if (l.code) bottom.push(['code', l.code, 1.1, 2]);}
    else {
      if (f.code) bottom.push(['code', l.code, 1.15, 1]);
      if (f.name && l.name) bottom.push(['name', l.name, 1, 2]);
      if (f.group && l.group) bottom.push(['group', l.group, .8, 1]);
      if (meta) bottom.push(['meta', meta, .78, 1]);
    }
    return {top:f.brand && o.brand.trim() ? [['brand', o.brand.trim(), .68, 1]] : [], bottom};
  }
  function labelHtml(c, svg) {
    const {w, h, l} = c, pad = clamp(Math.min(w,h)*.06, 1, 3.5), scale = clamp(num(o.font,100),50,200)/100;
    const {top, bottom} = lines(l), all = [...top, ...bottom];
    const hgt = (arr, fs) => arr.reduce((s, [, , k, n]) => s + fs*k*1.18*(n > 1 ? 1.6 : 1), 0);
    const line = (fs) => ([cls, text, k, n]) => `<span class="qrs-t qrs-${cls}" style="font-size:${(fs*k).toFixed(2)}mm;${n > 1 ? 'white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;' : ''}">${esc(text)}</span>`;
    let qr, inner;
    if (o.layout === 'horizontal' && all.length) {
      qr = Math.min(h - 2*pad, w*.55);
      const tw = w - qr - 3*pad, avail = h - 2*pad;
      let fs = clamp(Math.min(avail*.17, tw*.12), 1.3, 5) * scale;
      const need = hgt(all, fs); if (need > avail) fs *= avail / need;
      inner = `<div class="qrs-qr" style="width:${qr.toFixed(2)}mm;height:${qr.toFixed(2)}mm">${svg}</div><div class="qrs-text" style="width:${tw.toFixed(2)}mm">${all.map(line(fs)).join('')}</div>`;
      return `<div class="qrs-label horiz${o.cut ? ' cut' : ''}" style="left:${c.x}mm;top:${c.y}mm;width:${w}mm;height:${h}mm;padding:${pad}mm;gap:${pad}mm">${inner}</div>`;
    }
    const side = Math.min(w, h) - 2*pad;
    let fs = clamp(Math.min(w, h)*.075, 1.3, 4.6) * scale;
    const minQr = side * .5, room = h - 2*pad - minQr - pad*.5, need = hgt(all, fs);
    if (need > room && need > 0) fs *= Math.max(.3, room / need);
    qr = Math.min(w - 2*pad, h - 2*pad - hgt(all, fs) - (all.length ? pad*.5 : 0));
    qr = Math.max(qr, 4);
    inner = `${top.map(line(fs)).join('')}<div class="qrs-qr" style="width:${qr.toFixed(2)}mm;height:${qr.toFixed(2)}mm">${svg}</div>${bottom.map(line(fs)).join('')}`;
    return `<div class="qrs-label${o.cut ? ' cut' : ''}" style="left:${c.x}mm;top:${c.y}mm;width:${w}mm;height:${h}mm;padding:${pad}mm">${inner}</div>`;
  }
  async function pageHtml(p) {
    const cells = await Promise.all(p.cells.map(async c => labelHtml(c, await qrSvg(c.l.content))));
    const heads = (p.heads || []).map(hd => `<div class="qrs-head" style="left:${hd.x}mm;top:${hd.y}mm">${esc(hd.text)} <span>${hd.n} ${hd.n === 1 ? 'etiqueta' : 'etiquetas'}</span></div>`).join('');
    return `<div class="qrs-page${p.sheet ? ' sheet' : ''}" style="width:${p.w}mm;height:${p.h}mm">${heads}${cells.join('')}</div>`;
  }

  // ── Interfaz ──
  const seg = (opt, items) => `<div class="segmented qrs-seg" role="group">${items.map(([v, t]) => `<button type="button" data-qrs="set" data-opt="${opt}" data-value="${v}" class="${String(o[opt]) === v ? 'active' : ''}" aria-pressed="${String(o[opt]) === v}">${t}</button>`).join('')}</div>`;
  const numIn = (opt, label, min, max, step = 1, unit = '') => `<label class="qrs-num">${label}<span><input type="number" inputmode="decimal" data-opt="${opt}" value="${esc(o[opt])}" min="${min}" max="${max}" step="${step}">${unit ? `<em>${unit}</em>` : ''}</span></label>`;
  const chk = (opt, label, on, hint = '') => `<label class="check-label qrs-chk"><input type="checkbox" data-opt="${opt}" ${on ? 'checked' : ''}><span>${label}${hint ? `<em>${hint}</em>` : ''}</span></label>`;

  function singleSelect() {
    const groups = labelGroups();
    if (!o.single || !groups.some(g => g.items.some(i => i.id === o.single))) o.single = groups[0]?.items[0]?.id || '';
    return `<label class="qrs-field">Pieza o kit<select data-opt="single">${groups.map(g => `<optgroup label="${esc(g.title)}">${g.items.map(i => `<option value="${esc(i.id)}" ${i.id === o.single ? 'selected' : ''}>${esc(i.isKit ? 'Kit · ' + g.title : i.name)} — ${esc(byId(i.id)?.code || i.id)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
  }
  function sidePanel() {
    const P = paper();
    const what = o.mode === 'single' ? singleSelect()
      : o.mode === 'free' ? `<label class="qrs-field">Contenido del QR<textarea data-opt="freeText" rows="3" maxlength="900" placeholder="Un enlace, un texto o un código">${esc(o.freeText)}</textarea></label><label class="qrs-field">Texto bajo el QR <em>opcional</em><input data-opt="freeTitle" maxlength="80" value="${esc(o.freeTitle)}" placeholder="Ej.: Wi-Fi de bodega"></label>`
      : `<p class="qrs-note">Elige las piezas en la lista «Piezas». Puedes marcar kits completos o categorías.</p>`;
    const size = P.cols
      ? `<p class="qrs-note">La hoja trae etiquetas de <b>${fmt(P.lw)} × ${fmt(P.lh)} mm</b> en ${P.cols} columnas y ${P.rows} filas.</p>${numIn('start', 'Empezar en la etiqueta n.º', 1, P.cols*P.rows)}<p class="qrs-note">Sirve para aprovechar una hoja ya usada: cuenta de izquierda a derecha y de arriba abajo.</p>`
      : `<div class="qrs-sizes" role="group" aria-label="Tamaño">${SIZES.map(([v, t, sw, sh, d]) => `<button type="button" data-qrs="size" data-value="${v}" class="qrs-size ${o.size === v ? 'active' : ''}" aria-pressed="${o.size === v}"><strong>${t}</strong><small>${v === 'custom' ? d : `${sw} × ${sh} mm · ${d}`}</small></button>`).join('')}</div><div class="qrs-row">${numIn('w', 'Ancho', 10, 200, .5, 'mm')}${numIn('h', 'Alto', 10, 300, .5, 'mm')}</div>`;
    return `<aside class="panel panel-pad qrs-side">
      <section class="qrs-block"><h3><span>1</span> Qué imprimir</h3>${seg('mode', [['multi', 'Varias'], ['single', 'Una sola'], ['free', 'Texto o enlace']])}${what}</section>
      <section class="qrs-block"><h3><span>2</span> Papel</h3><label class="qrs-field">Dónde imprimes<select data-opt="paper">${Object.entries(PAPERS).map(([k, p]) => `<option value="${k}" ${o.paper === k ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>${P.roll ? '<p class="qrs-note">Cada etiqueta sale en su propia página, del tamaño exacto del rollo.</p>' : ''}</section>
      <section class="qrs-block"><h3><span>3</span> Tamaño</h3>${size}</section>
      <section class="qrs-block"><h3><span>4</span> Diseño</h3>${seg('layout', [['vertical', 'QR arriba'], ['horizontal', 'QR al lado'], ['solo', 'Solo QR']])}<p class="qrs-note">${o.layout === 'horizontal' ? 'Ideal para etiquetas apaisadas y cables.' : o.layout === 'solo' ? 'Sin textos: el QR ocupa toda la etiqueta.' : 'El QR va al centro y los datos debajo.'}</p></section>
      <section class="qrs-block ${o.layout === 'solo' ? 'is-off' : ''}"><h3><span>5</span> Datos en la etiqueta</h3><div class="qrs-checks">${FIELDS.map(([k, t]) => `<label class="check-label qrs-chk"><input type="checkbox" data-field="${k}" ${o.f[k] ? 'checked' : ''} ${o.layout === 'solo' ? 'disabled' : ''}><span>${t}</span></label>`).join('')}</div>${o.f.brand && o.layout !== 'solo' ? `<label class="qrs-field">Texto de la marca<input data-opt="brand" maxlength="40" value="${esc(o.brand)}"></label>` : ''}</section>
      <section class="qrs-block"><h3><span>6</span> Copias</h3>${numIn('copies', o.mode === 'multi' ? 'Copias de cada etiqueta' : 'Cantidad de etiquetas', 1, 200)}</section>
      <details class="qrs-block qrs-adv" ${open.has('adv') ? 'open' : ''} data-qrs-details="adv"><summary>Opciones avanzadas</summary>
        <fieldset class="qrs-ecc"><legend>Corrección de errores</legend>${ECC.map(([v, t, d]) => `<label class="check-label ${o.ecc === v ? 'active' : ''}"><input type="radio" name="qrsEcc" data-opt="ecc" value="${v}" ${o.ecc === v ? 'checked' : ''}><span><strong>${t}</strong><small>Se lee con ${d} dañado</small></span></label>`).join('')}</fieldset>
        <p class="qrs-note">Más corrección = QR más denso. «Alta» o «Máxima» si la etiqueta va en cases que se rayan.</p>
        <div class="qrs-row">${numIn('quiet', 'Borde blanco del QR', 0, 4, 1, 'mód.')}${numIn('font', 'Tamaño de letra', 50, 200, 5, '%')}</div>
        ${P.free ? `<div class="qrs-row">${numIn('margin', 'Margen de la hoja', 0, 40, 1, 'mm')}${numIn('gap', 'Separación', 0, 30, .5, 'mm')}</div>` : ''}
        ${chk('cut', 'Guías de corte', o.cut, P.cols ? 'En hojas precortadas, mejor apagado' : 'Línea fina alrededor de cada etiqueta')}
        ${P.free && o.mode === 'multi' ? chk('heads', 'Título por kit o categoría', o.heads, 'Ayuda a repartir las etiquetas') : ''}
      </details>
      <div class="qrs-block qrs-reset"><button type="button" class="btn ghost small" data-qrs="reset">${icon('back')} Volver a las opciones de fábrica</button></div>
    </aside>`;
  }
  function pickPanel() {
    const groups = labelGroups(), q = search.trim().toLowerCase();
    const locs = [...new Set(ctx.getState().assets.map(a => a.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const rows = groups.map(g => {
      const items = visible(g, q); if (!items.length) return '';
      const on = items.filter(i => sel.has(i.id)).length, isOpen = open.has(g.id) || !!q;
      let lastTag = null;
      const list = items.map(i => {const head = i.tag && i.tag !== lastTag ? `<div class="lab-subhead">${esc(i.tag)}</div>` : ''; lastTag = i.tag;
        return `${head}<label class="lab-item ${i.isKit ? 'is-kit' : ''}"><input type="checkbox" data-qrs-item="${esc(i.id)}" ${sel.has(i.id) ? 'checked' : ''}><span class="lab-name">${esc(i.name)}</span><span class="lab-code">${esc(byId(i.id)?.code || i.id)}</span></label>`;}).join('');
      return `<section class="lab-group ${isOpen ? 'open' : ''}" data-gid="${esc(g.id)}"><div class="lab-head"><input type="checkbox" data-qrs-group="${esc(g.id)}" aria-label="Elegir todo ${esc(g.title)}" ${on === items.length ? 'checked' : ''}><div class="lab-title"><strong>${esc(g.title)}</strong><small>${esc(g.sub)}</small></div><span class="lab-count ${on ? 'some' : ''}" data-qrs-count="${esc(g.id)}">${on}/${items.length}</span><button type="button" class="lab-toggle" data-qrs="toggle" data-group="${esc(g.id)}" aria-expanded="${isOpen}">${isOpen ? 'Ocultar' : 'Ver piezas'} ${icon('down')}</button></div><div class="lab-items">${list}</div></section>`;
    }).join('');
    const cart = ctx.getCart().filter(id => byId(id) || kitById(id)).length;
    return `<section class="panel panel-pad qrs-pick"><div class="spread"><h2>Piezas</h2><span class="qrs-picked" id="qrsPicked">${sel.size} elegidas</span></div>
      <div class="qrs-filter"><label class="qrs-search">${icon('search')}<input type="search" data-qrs-search value="${esc(search)}" placeholder="Buscar por nombre, código o categoría" aria-label="Buscar piezas"></label>${locs.length > 1 ? `<select data-qrs-where aria-label="Bodega"><option value="">Todas las bodegas</option>${locs.map(l => `<option ${where === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}</div>
      <div class="lab-quick" role="group" aria-label="Selección rápida"><button type="button" class="btn small" data-qrs="all">Todo lo visible</button><button type="button" class="btn small" data-qrs="kits">Solo QR de kits <small>${ctx.getState().kits.length}</small></button>${cart ? `<button type="button" class="btn small" data-qrs="cart">Lo del carro <small>${cart}</small></button>` : ''}<button type="button" class="btn ghost small" data-qrs="none">Nada</button></div>
      <div class="lab-groups qrs-groups">${rows || '<p class="qrs-note">No hay piezas con ese filtro.</p>'}</div></section>`;
  }
  function visible(g, q) {
    return g.items.filter(i => {
      const a = byId(i.id), parts = !a && kitById(i.id) ? kitParts(i.id) : null;
      if (where && !(a ? a.location === where : parts?.some(p => p.location === where))) return false;
      if (!q) return true;
      return [i.name, i.id, a?.code, a?.category, a?.brand, a?.model, g.title].some(v => String(v || '').toLowerCase().includes(q));
    });
  }
  function actions() {
    const one = o.mode !== 'multi';
    return `<div class="qrs-actions"><div class="qrs-sum" id="qrsSummary">Preparando…</div><div class="qrs-btns">${one ? `<button type="button" class="btn small" data-qrs="png">${icon('download')} PNG</button><button type="button" class="btn small" data-qrs="svg">${icon('download')} SVG</button>` : ''}<button type="button" class="btn small" data-qrs="csv">${icon('download')} Lista CSV</button><button type="button" class="btn primary" data-qrs="print" id="qrsPrint">${icon('print')} Imprimir</button></div></div>`;
  }
  function view() {
    return `${heading('Ajustes', 'Etiquetas QR', 'Imprime una etiqueta, muchas o un QR libre. Elige papel, tamaño, diseño y qué datos lleva cada una.', `<a class="btn ghost" href="#settings">${icon('back')} Ajustes</a>`)}
      <div class="qrs" id="qrStudio"><div class="qrs-side-wrap" id="qrsSide">${sidePanel()}</div><div class="qrs-main">${actions()}${o.mode === 'multi' ? `<div id="qrsPick">${pickPanel()}</div>` : ''}<section class="panel panel-pad qrs-prev"><div class="spread"><h2>Vista previa</h2><span class="qrs-zoom" id="qrsZoom"></span></div><div class="qrs-pages" id="qrsPages"></div><p class="qrs-tip">${icon('info')}<span>Al imprimir elige <b>escala 100 %</b> (tamaño real) y márgenes <b>Ninguno</b>. Así las medidas calzan con el papel o la hoja de etiquetas.</span></p></section></div></div>`;
  }

  async function renderPreview() {
    const box = document.getElementById('qrsPages'); if (!box) return;
    const my = ++token, list = chosen(), pages = paginate(list), n = countLabels(list);
    const sum = document.getElementById('qrsSummary'), pr = document.getElementById('qrsPrint');
    if (pr) pr.disabled = !n;
    const P = paper(), {w, h} = labelSize();
    if (sum) sum.innerHTML = n ? `<strong>${n} ${n === 1 ? 'etiqueta' : 'etiquetas'}</strong><span>${pages.length} ${P.roll ? (pages.length === 1 ? 'etiqueta de rollo' : 'etiquetas de rollo') : pages.length === 1 ? 'hoja' : 'hojas'} · ${fmt(w)} × ${fmt(h)} mm</span>` : `<strong>Nada para imprimir</strong><span>${o.mode === 'free' ? 'Escribe el contenido del QR.' : 'Elige al menos una pieza.'}</span>`;
    if (!n) {box.innerHTML = `<div class="qrs-empty">${icon('qr')}<p>${o.mode === 'free' ? 'Escribe un texto o enlace para ver el QR.' : 'Marca piezas en la lista para ver aquí cómo quedan.'}</p></div>`; box.style.zoom = ''; return;}
    box.classList.toggle('roll', !!P.roll);
    const LIMIT = P.roll ? 40 : 12, shown = pages.slice(0, LIMIT);
    const html = (await Promise.all(shown.map(pageHtml))).join('');
    if (my !== token) return;
    const more = pages.length - shown.length;
    box.innerHTML = html + (more > 0 ? `<div class="qrs-more">y ${more} ${P.roll ? 'etiquetas' : 'hojas'} más (se imprimen todas)</div>` : '');
    fitZoom();
  }
  function fitZoom() {
    const box = document.getElementById('qrsPages'), first = box?.querySelector('.qrs-page'); if (!first) return;
    const P = paper(), pw = parseFloat(first.style.width) * PX, par = box.parentElement, cs = getComputedStyle(par);
    const avail = par.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
    const z = P.roll ? clamp(avail / (pw * 3 + 40), .5, 2.2) : clamp(avail / pw, .15, 1);
    box.style.zoom = z;
    const zl = document.getElementById('qrsZoom'); if (zl) zl.textContent = `Escala ${Math.round(z*100)} %`;
  }
  const schedule = (ms = 160) => {clearTimeout(timer); timer = setTimeout(renderPreview, ms);};
  function rerenderSide() {
    const side = document.getElementById('qrsSide'); if (!side) return;
    const a = document.activeElement, key = a?.dataset?.opt || a?.dataset?.field, val = a?.value, y = window.scrollY;
    side.innerHTML = sidePanel();
    if (key) side.querySelector(`[data-opt="${key}"]${a.type === 'radio' ? `[value="${val}"]` : ''},[data-field="${key}"]`)?.focus({preventScroll:true});
    window.scrollTo({top:y, behavior:'instant'});
  }
  function rerenderPick() {const p = document.getElementById('qrsPick'); if (p) {const f = document.activeElement?.matches?.('[data-qrs-search]'); const s = p.querySelector('.qrs-groups')?.scrollTop; p.innerHTML = pickPanel(); if (f) {const i = p.querySelector('[data-qrs-search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);} const g = p.querySelector('.qrs-groups'); if (g && s) g.scrollTop = s;}}
  const full = () => ctx.rerender();
  function updateCounts() {
    const q = search.trim().toLowerCase();
    for (const g of labelGroups()) {
      const items = visible(g, q), on = items.filter(i => sel.has(i.id)).length;
      const box = document.querySelector(`[data-qrs-group="${CSS.escape(g.id)}"]`), c = document.querySelector(`[data-qrs-count="${CSS.escape(g.id)}"]`);
      if (box) {box.checked = !!items.length && on === items.length; box.indeterminate = on > 0 && on < items.length;}
      if (c) {c.textContent = `${on}/${items.length}`; c.classList.toggle('some', on > 0);}
    }
    document.querySelectorAll('[data-qrs-item]').forEach(i => {i.checked = sel.has(i.dataset.qrsItem);});
    const p = document.getElementById('qrsPicked'); if (p) p.textContent = `${sel.size} ${sel.size === 1 ? 'elegida' : 'elegidas'}`;
    schedule();
  }

  // ── Salidas: imprimir, PNG, SVG, CSV ──
  async function print() {
    const list = chosen(); if (!countLabels(list)) return toast('Elige al menos una etiqueta.', true);
    const pages = paginate(list), btn = document.getElementById('qrsPrint'); if (btn) btn.disabled = true;
    try {
      document.getElementById('qrPrintRoot')?.remove(); document.getElementById('qrPageCss')?.remove();
      const root = document.createElement('div'); root.id = 'qrPrintRoot';
      root.innerHTML = (await Promise.all(pages.map(pageHtml))).join('');
      const css = document.createElement('style'); css.id = 'qrPageCss';
      css.textContent = `@media print{@page{size:${pages[0].w}mm ${pages[0].h}mm;margin:0}}`;
      document.head.append(css); document.body.append(root); document.body.classList.add('qr-printing');
      const done = () => {root.remove(); css.remove(); document.body.classList.remove('qr-printing'); removeEventListener('afterprint', done);};
      addEventListener('afterprint', done);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.print();
    } finally {if (btn) btn.disabled = false;}
  }
  const download = (name, href) => {const a = document.createElement('a'); a.href = href; a.download = name; document.body.append(a); a.click(); a.remove();};
  const fileName = () => {const l = chosen().find(x => x.l)?.l; return 'qr-' + String(l?.code || l?.key || 'libre').replace(/[^\w-]+/g, '-').slice(0, 40);};
  async function exportImage(kind) {
    const l = chosen().find(x => x.l)?.l; if (!l) return toast(o.mode === 'free' ? 'Escribe el contenido del QR.' : 'Elige una pieza.', true);
    const opt = {errorCorrectionLevel:o.ecc, margin:clamp(Math.round(num(o.quiet,1)),0,4)};
    if (kind === 'png') download(fileName() + '.png', await QRCode.toDataURL(l.content, {...opt, width:1200}));
    else {const url = URL.createObjectURL(new Blob([await QRCode.toString(l.content, {...opt, type:'svg'})], {type:'image/svg+xml'})); download(fileName() + '.svg', url); setTimeout(() => URL.revokeObjectURL(url), 4000);}
  }
  function exportCsv() {
    const labels = chosen().filter(x => x.l).map(x => x.l); if (!labels.length) return toast('Elige al menos una etiqueta.', true);
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Contenido QR', 'Código', 'Nombre', 'Kit o categoría', 'Bodega', 'N.º de serie'], ...labels.map(l => [l.content, l.code, l.name, l.group, l.location, l.serial])];
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
    download('etiquetas-qr.csv', url); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ── Eventos (solo dentro de #qrStudio) ──
  document.addEventListener('click', async e => {
    const el = e.target.closest('#qrStudio [data-qrs]'); if (!el) return;
    const a = el.dataset.qrs;
    try {
      if (a === 'set') {o[el.dataset.opt] = el.dataset.value; saveOpts(); if (el.dataset.opt === 'mode') return full(); rerenderSide(); schedule(0);}
      else if (a === 'size') {const s = SIZES.find(x => x[0] === el.dataset.value); o.size = s[0]; if (s[2]) {o.w = s[2]; o.h = s[3]; o.layout = s[0] === 'w' ? 'horizontal' : o.layout === 'horizontal' ? 'vertical' : o.layout;} saveOpts(); rerenderSide(); schedule(0);}
      else if (a === 'reset') {o = {...structuredClone(DEF), mode:o.mode, single:o.single, freeText:o.freeText, freeTitle:o.freeTitle}; saveOpts(); rerenderSide(); schedule(0); toast('Opciones de fábrica restablecidas.');}
      else if (a === 'toggle') {const g = el.dataset.group, sec = el.closest('.lab-group'), on = !open.has(g); on ? open.add(g) : open.delete(g); sec?.classList.toggle('open', on); el.setAttribute('aria-expanded', String(on)); el.innerHTML = `${on ? 'Ocultar' : 'Ver piezas'} ${icon('down')}`;}
      else if (a === 'all') {const q = search.trim().toLowerCase(); labelGroups().forEach(g => visible(g, q).forEach(i => sel.add(i.id))); updateCounts();}
      else if (a === 'none') {sel.clear(); updateCounts();}
      else if (a === 'kits') {sel = new Set(ctx.getState().kits.map(k => k.id)); updateCounts();}
      else if (a === 'cart') {ctx.getCart().forEach(id => {if (byId(id) || kitById(id)) sel.add(id);}); updateCounts();}
      else if (a === 'print') await print();
      else if (a === 'png' || a === 'svg') await exportImage(a);
      else if (a === 'csv') exportCsv();
    } catch (err) {toast(err.message || String(err), true);}
  });
  document.addEventListener('toggle', e => {const d = e.target; if (d.matches?.('#qrStudio [data-qrs-details]')) d.open ? open.add(d.dataset.qrsDetails) : open.delete(d.dataset.qrsDetails);}, true);
  const onField = (e, commit) => {
    const el = e.target; if (!el.closest?.('#qrStudio')) return;
    if (el.matches('[data-qrs-search]')) {if (!commit) {search = el.value; rerenderPick();} return;}
    if (el.matches('[data-qrs-where]')) {if (commit) {where = el.value; rerenderPick(); schedule();} return;}
    if (el.matches('[data-qrs-item]')) {if (commit) {el.checked ? sel.add(el.dataset.qrsItem) : sel.delete(el.dataset.qrsItem); updateCounts();} return;}
    if (el.matches('[data-qrs-group]')) {if (commit) {const g = labelGroups().find(x => x.id === el.dataset.qrsGroup), q = search.trim().toLowerCase(); if (g) visible(g, q).forEach(i => el.checked ? sel.add(i.id) : sel.delete(i.id)); updateCounts();} return;}
    if (el.dataset.field) {if (commit) {o.f[el.dataset.field] = el.checked; saveOpts(); rerenderSide(); schedule(0);} return;}
    const k = el.dataset.opt; if (!k) return;
    const v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' && !['checkbox', 'radio'].includes(el.type)) {
      o[k] = el.type === 'number' ? (el.value === '' ? o[k] : num(el.value, o[k])) : v;
      if (k === 'w' || k === 'h') {o.size = 'custom'; document.querySelectorAll('#qrStudio .qrs-size').forEach(b => {const on = b.dataset.value === 'custom'; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));});}
      saveOpts(); schedule(commit ? 0 : 260);
      return;
    }
    if (!commit) return;
    o[k] = v; saveOpts();
    if (k === 'single') {schedule(0); return;}
    rerenderSide(); schedule(0);
  };
  document.addEventListener('input', e => onField(e, false));
  document.addEventListener('change', e => onField(e, true));
  addEventListener('resize', () => {if (document.getElementById('qrsPages')) fitZoom();});

  return {
    view,
    mount() {renderPreview();},
    // Abre el centro con piezas ya elegidas (desde inventario, carro o ficha de kit).
    preset(ids) {
      const valid = (ids || []).filter(id => byId(id) || kitById(id));
      if (valid.length) {sel = new Set(valid); o.mode = 'multi'; search = ''; where = ''; open = new Set([...open].filter(x => x === 'adv')); labelGroups().forEach(g => {if (g.items.some(i => sel.has(i.id))) open.add(g.id);}); saveOpts();}
    },
    presetSingle(id) {if (byId(id) || kitById(id)) {o.mode = 'single'; o.single = id; saveOpts();}},
    selectAll() {sel = new Set(labelGroups().flatMap(g => g.items.map(i => i.id))); o.mode = 'multi'; saveOpts();},
  };
}
