(() => {
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dlab = (d) => (d ? `${+d.slice(8, 10)} ${MES[+d.slice(5, 7) - 1]}` : '—');
  const nf = new Intl.NumberFormat('es-CO');
  const nf1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const st = { tab: 'resumen', d0: '', d1: '', ruta: '', fot: '', larea: '', parea: '', ptipo: '', sort: 'kg', dir: -1, more: {} };
  const tip = $('#lx-tip'), wrap = $('#lx-dash');
  const showTip = (lines, ev) => {
    tip.replaceChildren();
    lines.forEach((t, i) => tip.appendChild(el(i ? 'div' : 'b', '', t)));
    tip.hidden = false;
    const r = wrap.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 12, r.width - 200)) + 'px';
    tip.style.top = (ev.clientY - r.top + 14) + 'px';
  };
  const hideTip = () => { tip.hidden = true; };
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const C = { vg: 'var(--vg)', am: 'var(--am)', az: 'var(--te)', gr: 'var(--gy)' };

  // ---------------------------------------------------------------------
  // Helpers de dibujo (d3) — reutilizables en todas las pestañas
  // ---------------------------------------------------------------------
  const mkSvg = (box, h) => {
    box.replaceChildren();
    const w = Math.max(box.clientWidth, 260);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h);
    return { w, svg };
  };

  const hBars = (box, rows, opt) => {
    const rh = 26, m = { t: 4, r: 56, b: 4, l: opt.lw || 50 };
    const { w, svg } = mkSvg(box, rows.length * rh + m.t + m.b);
    const max = d3.max(rows, (d) => d.v) || 1;
    const x = d3.scaleLinear([0, max], [0, w - m.l - m.r]);
    const g = svg.append('g').attr('class', 'lx-bars');
    rows.forEach((d, i) => {
      const y = m.t + i * rh;
      g.append('text').attr('x', m.l - 8).attr('y', y + rh / 2 + 4).attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 12).text(d.k);
      g.append('rect').attr('x', m.l).attr('y', y + 3).attr('height', rh - 8).attr('width', Math.max(2, x(d.v))).attr('rx', 4)
        .attr('fill', d.c || (d.sel ? 'var(--am)' : 'var(--vg)')).attr('opacity', opt.dim && !d.sel ? .35 : 1).style('cursor', opt.pick ? 'pointer' : 'default')
        .on('mousemove', (ev) => showTip(d.tip, ev)).on('mouseleave', hideTip)
        .on('click', () => opt.pick && opt.pick(d.id));
      g.append('text').attr('x', m.l + Math.max(2, x(d.v)) + 6).attr('y', y + rh / 2 + 4).attr('fill', 'var(--color-fg, #4D4D4D)').attr('font-size', 12).text(opt.fmt(d.v));
    });
  };

  const hGroup = (box, groups, series, fmt) => {
    const gh = 34, m = { t: 4, r: 40, b: 4, l: 50 };
    const { w, svg } = mkSvg(box, groups.length * gh + m.t + m.b);
    const max = d3.max(groups, (g) => d3.max(g.vals)) || 1;
    const x = d3.scaleLinear([0, max], [0, w - m.l - m.r]);
    const g0 = svg.append('g').attr('class', 'lx-bars');
    groups.forEach((g, i) => {
      const y = m.t + i * gh;
      g0.append('text').attr('x', m.l - 8).attr('y', y + gh / 2 + 4).attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 12).text(g.k);
      g.vals.forEach((v, j) => {
        g0.append('rect').attr('x', m.l).attr('y', y + 3 + j * 13).attr('height', 11).attr('width', Math.max(v ? 2 : 0, x(v))).attr('rx', 3).attr('fill', series[j].c)
          .on('mousemove', (ev) => showTip([g.id, `${series[j].n}: ${fmt(v)}`], ev)).on('mouseleave', hideTip);
        g0.append('text').attr('x', m.l + Math.max(v ? 2 : 0, x(v)) + 5).attr('y', y + 12 + j * 13).attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 10).text(fmt(v));
      });
    });
  };

  const cols = (box, groups, series, fmt, unit) => {
    const h = 230, m = { t: 8, r: 6, b: 24, l: 40 };
    const { w, svg } = mkSvg(box, h);
    const max = d3.max(groups, (g) => d3.max(g.vals)) || 1;
    const y = d3.scaleLinear([0, max], [h - m.b, m.t]).nice();
    const x0 = d3.scaleBand(groups.map((g) => g.k), [m.l, w - m.r]).paddingInner(.2);
    const x1 = d3.scaleBand(series.map((s, i) => i), [0, x0.bandwidth()]).padding(.08);
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--color-border-line, #DCDCDC)');
      svg.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 11).text(fmt(t));
    });
    const every = Math.ceil(groups.length / Math.max(1, Math.floor((w - m.l) / 46)));
    const g = svg.append('g').attr('class', 'lx-bars');
    groups.forEach((gr, gi) => {
      if (gi % every === 0) svg.append('text').attr('x', x0(gr.k) + x0.bandwidth() / 2).attr('y', h - 7).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 11).text(gr.k);
      gr.vals.forEach((v, j) => {
        g.append('rect').attr('x', x0(gr.k) + x1(j)).attr('y', y(v)).attr('width', x1.bandwidth()).attr('height', Math.max(0, y(0) - y(v))).attr('rx', 3).attr('fill', series[j].c)
          .on('mousemove', (ev) => showTip([gr.t || gr.k, `${series[j].n}: ${fmt(v)}${unit ? ' ' + unit : ''}`], ev)).on('mouseleave', hideTip);
      });
    });
  };

  const lineBand = (box, pts, mean, sd, reg) => {
    const h = 250, m = { t: 10, r: 12, b: 28, l: 46 };
    const { w, svg } = mkSvg(box, h);
    const max = d3.max(pts, (p) => Math.max(p.v, mean + sd)) || 1;
    const y = d3.scaleLinear([0, max], [h - m.b, m.t]).nice();
    const x = d3.scalePoint(pts.map((p) => p.k), [m.l + 12, w - m.r - 12]);
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--color-border-line, #DCDCDC)');
      svg.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 11).text(nf.format(t));
    });
    svg.append('rect').attr('x', m.l).attr('width', w - m.l - m.r).attr('y', y(mean + sd)).attr('height', Math.max(0, y(Math.max(0, mean - sd)) - y(mean + sd))).attr('fill', 'var(--vg)').attr('opacity', .13);
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(mean)).attr('y2', y(mean)).attr('stroke', 'var(--vg)').attr('stroke-dasharray', '5 4');
    if (reg) svg.append('line').attr('x1', x(pts[0].k)).attr('x2', x(pts[pts.length - 1].k)).attr('y1', y(reg.a + reg.b * pts[0].t)).attr('y2', y(reg.a + reg.b * pts[pts.length - 1].t)).attr('stroke', 'var(--te)').attr('stroke-width', 2).attr('stroke-dasharray', '2 4');
    svg.append('path').attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2).attr('d', d3.line().x((p) => x(p.k)).y((p) => y(p.v))(pts));
    const every = Math.ceil(pts.length / Math.max(1, Math.floor((w - m.l) / 46)));
    pts.forEach((p, i) => {
      if (i % every === 0) svg.append('text').attr('x', x(p.k)).attr('y', h - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 11).text(p.k);
      svg.append('circle').attr('cx', x(p.k)).attr('cy', y(p.v)).attr('r', 5).attr('fill', p.low ? 'var(--color-bg, #fff)' : 'var(--am)').attr('stroke', 'var(--ink)').attr('stroke-width', 1.5)
        .on('mousemove', (ev) => showTip([p.k, `${nf.format(p.v)} kg`, `${p.n} registro${p.n === 1 ? '' : 's'}${p.low ? ' (día incompleto)' : ''}`], ev)).on('mouseleave', hideTip);
    });
  };

  const boxes = (box, rows) => {
    const rh = 30, m = { t: 6, r: 24, b: 20, l: 50 };
    const { w, svg } = mkSvg(box, rows.length * rh + m.t + m.b);
    const max = d3.max(rows, (r) => r.max) || 1;
    const x = d3.scaleLinear([0, max], [m.l, w - m.r]).nice();
    x.ticks(5).forEach((t) => {
      svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', m.t + rows.length * rh).attr('stroke', 'var(--color-border-line, #DCDCDC)');
      svg.append('text').attr('x', x(t)).attr('y', m.t + rows.length * rh + 14).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 11).text(nf.format(t));
    });
    rows.forEach((r, i) => {
      const cy = m.t + i * rh + rh / 2;
      svg.append('text').attr('x', m.l - 8).attr('y', cy + 4).attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 12).text(r.k);
      svg.append('line').attr('x1', x(r.min)).attr('x2', x(r.max)).attr('y1', cy).attr('y2', cy).attr('stroke', 'var(--ink)');
      svg.append('rect').attr('x', x(r.q1)).attr('width', Math.max(2, x(r.q3) - x(r.q1))).attr('y', cy - 8).attr('height', 16).attr('rx', 3).attr('fill', 'var(--vg)').attr('opacity', .8)
        .on('mousemove', (ev) => showTip([r.id, `n = ${r.n}`, `mín ${nf.format(r.min)} · Q1 ${nf1.format(r.q1)}`, `mediana ${nf1.format(r.med)}`, `Q3 ${nf1.format(r.q3)} · máx ${nf.format(r.max)}`], ev)).on('mouseleave', hideTip);
      svg.append('line').attr('x1', x(r.med)).attr('x2', x(r.med)).attr('y1', cy - 8).attr('y2', cy + 8).attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      r.vals.forEach((v) => svg.append('circle').attr('cx', x(v)).attr('cy', cy).attr('r', 2.2).attr('fill', 'var(--ink)').attr('opacity', .55));
    });
  };

  const heat = (box, rowsDef, days, val) => {
    const cw0 = 42, rh = 24, m = { t: 20, r: 6, b: 4, l: 50 };
    const { w, svg } = mkSvg(box, rowsDef.length * rh + m.t + m.b);
    const cw = Math.max(18, Math.min(cw0, (w - m.l - m.r) / days.length));
    let max = 0; rowsDef.forEach((r) => days.forEach((d) => { const v = val(r, d); if (v != null) max = Math.max(max, v); }));
    const col = d3.scaleLinear([0, max || 1], ['#e9f3d6', '#4c7a1c']);
    days.forEach((d, j) => svg.append('text').attr('x', m.l + j * cw + cw / 2).attr('y', 12).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 10).text(dlab(d).split(' ')[0]));
    rowsDef.forEach((r, i) => {
      svg.append('text').attr('x', m.l - 8).attr('y', m.t + i * rh + rh / 2 + 4).attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted, #707070)').attr('font-size', 12).text(r.k);
      days.forEach((d, j) => {
        const v = val(r, d);
        const g = svg.append('g');
        g.append('rect').attr('x', m.l + j * cw + 1).attr('y', m.t + i * rh + 1).attr('width', cw - 2).attr('height', rh - 2).attr('rx', 3).attr('fill', v == null ? 'none' : col(v)).attr('stroke', v == null ? 'var(--color-border-line, #DCDCDC)' : 'none').attr('stroke-dasharray', v == null ? '2 2' : null)
          .on('mousemove', (ev) => showTip([r.id, dlab(d), v == null ? 'sin registro' : `${nf.format(v)} kg`], ev)).on('mouseleave', hideTip);
        if (v != null && cw >= 26) g.append('text').attr('x', m.l + j * cw + cw / 2).attr('y', m.t + i * rh + rh / 2 + 4).attr('text-anchor', 'middle').attr('font-size', 10).attr('pointer-events', 'none').attr('fill', v > max * .55 ? '#fff' : '#333').text(nf.format(v));
      });
    });
  };

  const regress = (pts) => {
    if (pts.length < 2) return null;
    const mx = d3.mean(pts, (p) => p.t), my = d3.mean(pts, (p) => p.v);
    const den = d3.sum(pts, (p) => (p.t - mx) ** 2);
    if (!den) return null;
    const b = d3.sum(pts, (p) => (p.t - mx) * (p.v - my)) / den;
    return { a: my - b * mx, b };
  };

  // ---------------------------------------------------------------------
  // Pestañas vacías: líneas de servicio que la aplicación aún no registra.
  // Se muestran para que el equipo sepa qué datos capturaría cada una,
  // sin inventar cifras.
  // ---------------------------------------------------------------------
  const EMPTY = {
    cesped: { n: 'Corte de césped', d: 'Jornadas de corte de césped en parques y áreas públicas.', campos: ['Fecha', 'Área pública', 'Hora de inicio y fin', 'Operativos', 'm² intervenidos', 'Residuos recogidos (kg)', 'Ubicación GPS', 'Observación', 'Hasta 4 fotos'], kpis: [['Jornadas', 'registros de corte'], ['m² intervenidos', 'suma de las jornadas'], ['Residuos de corte', 'kilogramos'], ['m² por operativo', 'rendimiento'], ['Fotos', 'de evidencia']] },
    mantto: { n: 'Mantenimiento de cestas', d: 'Intervenciones de reparación o reposición de cestas.', campos: ['Fecha', 'Cesta intervenida', 'Tipo de intervención', 'Descripción', 'Operativos', 'Observación', 'Hasta 4 fotos'], kpis: [['Intervenciones', 'registros'], ['Cestas intervenidas', 'distintas'], ['Por tipo', 'reparación, reposición…'], ['Operativos por jornada', 'promedio'], ['Fotos', 'de evidencia']] },
    recurb: { n: 'Recolección urbana', d: 'Toneladas recogidas por ruta en el casco urbano y viajes al relleno.', campos: ['Fecha', 'Ruta de recolección', 'Tipo de residuo', 'Peso (toneladas)', 'Viaje al relleno', 'Observación', 'Hasta 4 fotos'], kpis: [['Toneladas recogidas', 'suma'], ['Viajes al relleno', 'total'], ['t por viaje', 'promedio'], ['Por tipo de residuo', 'ordinario, orgánico, reciclaje…'], ['Fotos', 'de evidencia']] },
    recver: { n: 'Recolección veredal', d: 'Toneladas recogidas por vereda, usuarios atendidos y viajes al relleno.', campos: ['Fecha', 'Vereda', 'Tipo de residuo', 'Peso (toneladas)', 'Usuarios atendidos', 'Viaje al relleno', 'Observación', 'Hasta 4 fotos'], kpis: [['Toneladas recogidas', 'suma'], ['Usuarios atendidos', 'total'], ['kg por usuario', 'promedio'], ['Viajes al relleno', 'total'], ['Fotos', 'de evidencia']] },
    sumin: { n: 'Suministros usados', d: 'Insumos y alquileres consumidos en cada actividad (hidrolavadora, gasolina, guadaña, costales…).', campos: ['Actividad de origen', 'Suministro', 'Cantidad', 'Valor unitario del catálogo'], kpis: [['Costo estimado', 'cantidad × valor unitario'], ['Suministros distintos', 'usados'], ['Mayor consumo', 'por suministro'], ['Costo por actividad', 'promedio']] },
  };
  const emptyPages = () => {
    Object.entries(EMPTY).forEach(([id, e]) => {
      const s = el('section', 'lx-page'); s.id = 'pg-' + id; s.dataset.page = id; s.hidden = true;
      const k = el('div', 'lx-kpis');
      e.kpis.forEach(([l, sub]) => { const c = el('div', 'lx-card lx-kpi'); c.append(el('small', '', l), el('strong', '', '—'), el('span', '', sub)); k.appendChild(c); });
      const c1 = el('section', 'lx-card'); c1.style.marginBottom = '16px';
      c1.append(el('h2', '', e.n), el('p', 'lx-note', e.d), el('p', 'lx-empty', 'Todavía no hay jornadas registradas. Cuando el equipo registre la primera desde la aplicación, esta pestaña mostrará indicadores, gráficos, filtros y fotos.'));
      const c2 = el('section', 'lx-card'); c2.style.marginBottom = '16px';
      const pills = el('div', 'lx-acts'); e.campos.forEach((t) => pills.appendChild(el('span', 'lx-pill', t)));
      c2.append(el('h2', '', 'Datos que registraría la aplicación'), el('p', 'lx-note', 'Con estos campos se calcularían los indicadores de arriba.'), pills);
      s.append(k, c1, c2);
      wrap.insertBefore(s, $('.lx-foot'));
    });
  };

  const kpis = (box, items) => {
    box.replaceChildren();
    items.forEach(([l, v, s]) => {
      const c = el('div', 'lx-card lx-kpi');
      c.append(el('small', '', l), el('strong', '', v), el('span', '', s || ''));
      box.appendChild(c);
    });
  };

  const table = (t, colsDef, rows) => {
    t.replaceChildren();
    const th = el('thead'), trh = el('tr');
    colsDef.forEach((c) => trh.appendChild(el('th', c.l ? 'l' : '', c.h)));
    th.appendChild(trh);
    const tb = el('tbody');
    rows.forEach((r) => { const tr = el('tr'); colsDef.forEach((c) => tr.appendChild(el('td', (c.l ? 'l ' : '') + (c.wrap ? 'wrap' : ''), c.f(r)))); tb.appendChild(tr); });
    t.append(th, tb);
  };

  // ---------------------------------------------------------------------
  // Lightbox de fotos
  // ---------------------------------------------------------------------
  // Miniaturas: doGet no puede servir imagenes, asi que se piden por lotes via google.script.run
  // y se guardan en memoria como data URI (it.src es la ruta de la foto, no una URL).
  const thumbs = new Map();
  const thumbWait = new Map();
  const thumbQueue = [];
  let thumbBusy = 0;
  const thumbPump = () => {
    while (thumbBusy < 3 && thumbQueue.length) {
      const size = thumbQueue[0].size;
      const batch = [];
      while (thumbQueue.length && thumbQueue[0].size === size && batch.length < 4) batch.push(thumbQueue.shift());
      thumbBusy++;
      const finish = (res) => {
        batch.forEach(({ path }) => {
          const k = size + '|' + path, uri = (res && res[path]) || '';
          thumbs.set(k, uri);
          (thumbWait.get(k) || []).forEach((f) => f(uri));
          thumbWait.delete(k);
        });
        thumbBusy--; thumbPump();
      };
      google.script.run.withSuccessHandler(finish).withFailureHandler(() => finish(null))
        .getPhotoThumbs(batch.map((b) => b.path), size);
    }
  };
  const thumbGet = (path, size, cb) => {
    const k = size + '|' + path;
    if (thumbs.has(k)) { cb(thumbs.get(k)); return; }
    if (thumbWait.has(k)) { thumbWait.get(k).push(cb); return; }
    thumbWait.set(k, [cb]); thumbQueue.push({ path, size }); thumbPump();
  };
  // Sondeo simple (mas fiable que IntersectionObserver dentro del marco de Apps Script):
  // carga las miniaturas visibles, o a menos de 300 px de la pantalla, de la pestana activa.
  const thumbPending = new Set();
  const thumbScan = () => {
    thumbPending.forEach((b) => {
      if (!b.isConnected) { thumbPending.delete(b); return; }
      if (!b.offsetParent) return;
      const r = b.getBoundingClientRect();
      if (r.bottom > -300 && r.top < window.innerHeight + 300) { thumbPending.delete(b); b._load(); }
    });
  };
  setInterval(thumbScan, 500);

  const lb = { items: [], i: 0 };
  const lbShow = () => {
    const it = lb.items[lb.i], img = $('#lb-img');
    img.src = thumbs.get('480|' + it.src) || ''; img.alt = it.cap;
    $('#lb-cap').textContent = `${it.cap} · ${lb.i + 1} de ${lb.items.length}`;
    thumbGet(it.src, 1400, (u) => { if (u && lb.items[lb.i] === it) img.src = u; });
  };
  const lbOpen = (items, i) => { lb.items = items; lb.i = i; lbShow(); $('#lx-lb').hidden = false; $('#lb-x').focus(); };
  const lbStep = (d) => { lb.i = (lb.i + d + lb.items.length) % lb.items.length; lbShow(); };
  $('#lb-prev').addEventListener('click', () => lbStep(-1));
  $('#lb-next').addEventListener('click', () => lbStep(1));
  $('#lb-x').addEventListener('click', () => { $('#lx-lb').hidden = true; });
  $('#lx-lb').addEventListener('click', (e) => { if (e.target.id === 'lx-lb') $('#lx-lb').hidden = true; });
  document.addEventListener('keydown', (e) => {
    if ($('#lx-lb').hidden) return;
    if (e.key === 'Escape') $('#lx-lb').hidden = true;
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  });

  const gallery = (box, items, key) => {
    box.replaceChildren();
    if (!items.length) { box.appendChild(el('p', 'lx-empty', 'Sin fotos en esta selección.')); return; }
    const lim = st.more[key] || 36;
    items.slice(0, lim).forEach((it, i) => {
      const b = el('button', 'lx-ph'); b.type = 'button'; b.setAttribute('aria-label', `Ampliar foto: ${it.cap}`);
      const im = el('img'); im.alt = it.cap;
      b._load = () => thumbGet(it.src, 480, (u) => {
        if (u) im.src = u;
        else { im.remove(); b.insertBefore(el('em', 'lx-ph-x', 'Vista previa no disponible'), b.firstChild); }
      });
      thumbPending.add(b);
      b.append(im, el('span', '', it.cap));
      b.addEventListener('click', () => lbOpen(items, i));
      box.appendChild(b);
    });
    if (items.length > lim) {
      const m = el('button', 'lx-btn lx-more', `Ver más fotos (${nf.format(items.length - lim)} restantes)`); m.type = 'button';
      m.style.gridColumn = '1 / -1';
      m.addEventListener('click', () => { st.more[key] = lim + 36; draw(); });
      box.appendChild(m);
    }
  };

  const photosOf = (rows) => rows.flatMap((r) => r.fotos.map((url) => ({ src: url, cap: `${r.svc} · ${dlab(r.f)}` })));

  // ---------------------------------------------------------------------
  // Pestañas
  // ---------------------------------------------------------------------
  const TABS = [['resumen', 'Resumen'], ['barrido', 'Barrido'], ['lavado', 'Lavado de áreas'], ['poda', 'Poda de árboles'], ['cestas', 'Limpieza de cestas'], ...Object.entries(EMPTY).map(([id, e]) => [id, e.n])];
  emptyPages();
  const tabsEl = $('#lx-tabs');
  const setTab = (t) => {
    st.tab = t;
    document.querySelectorAll('.lx-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    document.querySelectorAll('.lx-page').forEach((p) => { p.hidden = p.dataset.page !== t; });
    draw();
  };
  TABS.forEach(([id, n]) => {
    const b = el('button', 'lx-tab', n); b.type = 'button'; b.dataset.tab = id; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(id === st.tab));
    b.addEventListener('click', () => setTab(id));
    tabsEl.appendChild(b);
  });

  let X = null, V = null;
  const inR = (r) => (!st.d0 || r.f >= st.d0) && (!st.d1 || r.f <= st.d1);
  const draw = () => {
    if (!X) return;
    V = { ...X, barrido: X.barrido.filter(inR), lavado: X.lavado.filter(inR), poda: X.poda.filter(inR), cestas: X.cestas.filter(inR) };
    $('#f-d0').value = st.d0; $('#f-d1').value = st.d1;
    const on = st.d0 || st.d1 || st.ruta || st.fot || st.larea || st.parea || st.ptipo;
    $('#f-note').textContent = on ? 'Filtros activos' : '';
    ({ resumen: drawResumen, barrido: drawBarrido, lavado: drawLavado, poda: drawPoda, cestas: drawCestas, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, () => {}])) })[st.tab]();
  };

  const drawResumen = () => {
    const { barrido, lavado, poda, cestas } = V;
    const all = [['Barrido', barrido, C.vg], ['Lavado', lavado, C.az], ['Poda', poda, C.am], ['Cestas', cestas, C.gr]];
    const nfot = (rows) => sum(rows, (r) => r.fotos.length);
    const dias = [...new Set(all.flatMap(([, rows]) => rows.map((r) => r.f)))].sort();
    const kgTot = sum(barrido, (r) => r.kg) + sum(poda, (r) => r.kg) + sum(cestas, (r) => r.kg);
    if (!dias.length) { $('#lx-take').textContent = 'No hay registros en el periodo elegido.'; kpis($('#rs-kpis'), []); ['#ch-rs', '#ch-fs', '#rs-svc', '#rs-gal', '#lg-rs'].forEach((q) => $(q).replaceChildren()); return; }
    kpis($('#rs-kpis'), [
      ['Registros', nf.format(sum(all, ([, r]) => r.length)), '4 servicios con datos'],
      ['Días con actividad', nf.format(dias.length), `del ${dlab(dias[0])} al ${dlab(dias[dias.length - 1])}`],
      ['Residuos registrados', nf.format(kgTot), 'kg: barrido, poda y cestas'],
      ['Metros cuadrados lavados', nf.format(sum(lavado, (r) => r.m2)), `${nf.format(lavado.length)} jornadas`],
      ['Fotos de evidencia', nf.format(sum(all, ([, r]) => nfot(r))), 'cargadas en la aplicación'],
    ]);
    $('#lx-take').textContent = `${nf.format(sum(all, ([, r]) => r.length))} registros de cuatro servicios entre el ${dlab(dias[0])} y el ${dlab(dias[dias.length - 1])}: ${nf.format(kgTot)} kg de residuos, ${nf.format(sum(lavado, (r) => r.m2))} m² lavados, ${nf.format(sum(poda, (r) => r.arboles))} árboles podados y ${nf.format(sum(cestas, (r) => r.cestas))} cestas limpiadas.`;
    $('#lg-rs').replaceChildren(...all.map(([n, , c]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, n); return s; }));
    cols($('#ch-rs'), dias.map((d) => ({ k: dlab(d), vals: all.map(([, rows]) => rows.filter((r) => r.f === d).length) })), all.map(([n, , c]) => ({ n, c })), (v) => nf.format(v), 'registros');
    hBars($('#ch-fs'), all.map(([n, rows, c]) => ({ k: n, v: nfot(rows), c, tip: [n, `${nf.format(nfot(rows))} fotos`] })), { fmt: (v) => nf.format(v), lw: 62 });
    const svc = $('#rs-svc'); svc.replaceChildren();
    const last = (rows) => rows.map((r) => r.f).sort().pop();
    [['barrido', 'Barrido y limpieza de vías', barrido], ['lavado', 'Lavado de áreas públicas', lavado], ['poda', 'Poda de árboles', poda], ['cestas', 'Limpieza de cestas', cestas]].forEach(([id, n, rows]) => {
      const b = el('button', 'lx-card lx-s'); b.type = 'button';
      b.append(el('h3', '', n), el('p', '', `${nf.format(rows.length)} registros · ${nf.format(nfot(rows))} fotos`), el('span', 'st', `Último registro: ${dlab(last(rows))}`));
      b.addEventListener('click', () => setTab(id));
      svc.appendChild(b);
    });
    Object.entries(EMPTY).forEach(([id, e]) => {
      const b = el('button', 'lx-card lx-s'); b.type = 'button';
      b.append(el('h3', '', e.n), el('p', '', e.d), el('span', 'st', 'Aún sin registros'));
      b.addEventListener('click', () => setTab(id));
      svc.appendChild(b);
    });
    const recent = all.flatMap(([n, rows]) => photosOf(rows.map((r) => ({ ...r, svc: n })))).sort((a, c) => (a.cap < c.cap ? 1 : -1));
    gallery($('#rs-gal'), recent.slice(0, 12), 'rs');
  };

  const drawBarrido = () => {
    const { barrido: regs, cat } = V;
    const dias = [...new Set(regs.map((r) => r.f))].sort();
    $('#lx-ruta').value = st.ruta; $('#lx-fot').value = st.fot;
    const pick = (id) => { st.ruta = st.ruta === id ? '' : id; draw(); };
    const fr = regs.filter((r) => (!st.ruta || r.id === st.ruta) && (st.fot === 'foto' ? r.fotos.length : st.fot === 'obs' ? r.obs : true));
    const kg = sum(fr, (r) => r.kg), vb = sum(fr, (r) => r.vb), vl = sum(fr, (r) => r.vl);
    const nrut = new Set(fr.map((r) => r.id)).size;
    $('#k-reg').textContent = nf.format(fr.length);
    $('#k-reg-n').textContent = `${nf.format(nrut)} microruta${nrut === 1 ? '' : 's'}`;
    $('#k-vb').textContent = nf.format(vb);
    $('#k-vl').textContent = nf.format(vl);
    $('#k-kg').textContent = nf.format(kg);
    $('#k-avg').textContent = fr.length ? nf1.format(kg / fr.length) : '—';

    const byR = d3.rollups(fr, (v) => ({ kg: sum(v, (r) => r.kg), vb: sum(v, (r) => r.vb), vl: sum(v, (r) => r.vl) }), (r) => r.id).map(([id, o]) => ({ id, ...o }));
    const peso = byR.slice().sort((a, b) => b.kg - a.kg);
    hBars($('#ch-peso'), peso.map((d) => ({ id: d.id, k: d.id.replace('MR-', 'MR '), v: d.kg, sel: d.id === st.ruta, tip: [d.id, `${nf.format(d.kg)} kg`] })), { fmt: (v) => nf.format(v), pick, dim: !!st.ruta });
    const orden = cat.map((c) => c.id).filter((id) => byR.some((d) => d.id === id));
    hGroup($('#ch-vias'), orden.map((id) => { const d = byR.find((x) => x.id === id); return { id, k: id.replace('MR-', 'MR '), vals: [d.vb, d.vl] }; }), [{ n: 'Barridas', c: C.vg }, { n: 'Limpiadas', c: C.am }], (v) => nf.format(v));
    const diasF = [...new Set(fr.map((r) => r.f))].sort();
    const ncat = st.ruta ? 1 : cat.length;
    const mean = d3.mean(fr, (r) => r.kg) || 0, med = d3.median(fr, (r) => r.kg) || 0, sd = d3.deviation(fr, (r) => r.kg) || 0, cv = mean ? sd / mean : 0;
    const mx = fr.reduce((a, r) => (!a || r.kg > a.kg ? r : a), null), mn = fr.reduce((a, r) => (!a || r.kg < a.kg ? r : a), null);
    const pts = diasF.map((d) => { const rr = fr.filter((r) => r.f === d); return { k: dlab(d), t: Date.parse(d) / 864e5, v: sum(rr, (r) => r.kg), n: rr.length, low: rr.length < ncat / 2 }; });
    const dmean = d3.mean(pts, (p) => p.v) || 0, dsd = d3.deviation(pts, (p) => p.v) || 0;
    const full = pts.filter((p) => !p.low);
    const reg = regress(full.length >= 3 ? full : pts);
    const atip = [];
    const byRoute = d3.group(fr, (r) => r.id);
    byRoute.forEach((rr, id) => { if (rr.length < 4) return; const m1 = d3.mean(rr, (r) => r.kg), s1 = d3.deviation(rr, (r) => r.kg); if (!s1) return; rr.forEach((r) => { const z = (r.kg - m1) / s1; if (Math.abs(z) >= 2) atip.push({ r, z, m1 }); }); });
    const cvTxt = cv < .2 ? 'estable' : cv < .4 ? 'variación moderada' : 'variación alta';
    const conFoto = fr.filter((r) => r.fotos.length).length;
    $('#lx-take').textContent = fr.length ? `Barrido: ${nf.format(fr.length)} registros en ${nf.format(nrut)} microruta${nrut === 1 ? '' : 's'}, del ${dlab(dias[0])} al ${dlab(dias[dias.length - 1])}: ${nf.format(kg)} kg recogidos y ${nf.format(vb)} vías barridas.` : 'No hay registros de barrido con estos filtros.';
    if (fr.length) {
      kpis($('#bk-stats'), [
        ['Mediana por registro', nf1.format(med), 'kg · el valor central'],
        ['Desviación estándar', nf1.format(sd), 'kg entre registros'],
        ['Variabilidad (CV)', `${nf.format(Math.round(cv * 100))}%`, cvTxt],
        ['Registro máximo', nf.format(mx.kg), `kg · ${mx.id} · ${dlab(mx.f)}`],
        ['Registro mínimo', nf.format(mn.kg), `kg · ${mn.id} · ${dlab(mn.f)}`],
        ['Residuos por vía barrida', vb ? nf1.format(kg / vb) : '—', 'kg por vía'],
        ['Limpiadas / barridas', vb ? `${nf.format(Math.round(vl / vb * 100))}%` : '—', 'vías limpiadas sobre barridas'],
        ['Cobertura de registro', `${nf.format(Math.round(fr.length / (diasF.length * ncat) * 100))}%`, `registros sobre lo esperado (${nf.format(ncat)} microruta${ncat === 1 ? '' : 's'} × ${nf.format(diasF.length)} días)`],
        ['Tendencia diaria', reg ? `${reg.b > 0 ? '+' : ''}${nf1.format(reg.b)}` : '—', reg ? `kg por día · ${Math.abs(reg.b) < dmean * .01 ? 'sin cambio claro' : reg.b > 0 ? 'va en aumento' : 'va en descenso'}` : 'faltan días'],
        ['Registros atípicos', nf.format(atip.length), 'a 2 o más desviaciones de su microruta'],
        ['Registros con foto', `${nf.format(Math.round(conFoto / fr.length * 100))}%`, `${nf.format(conFoto)} de ${nf.format(fr.length)}`],
      ]);
    } else $('#bk-stats').replaceChildren();
    if (pts.length) lineBand($('#ch-evo'), pts, dmean, dsd, reg); else $('#ch-evo').replaceChildren();
    $('#evo-note').textContent = `Kilogramos por día con la media (línea punteada), la banda de ±1 desviación estándar y la tendencia (línea turquesa).${pts.some((p) => p.low) ? ' Los círculos vacíos son días con pocos registros y no entran en la tendencia.' : ''}`;
    const bx = cat.filter((c) => byRoute.has(c.id)).map((c) => { const v = byRoute.get(c.id).map((r) => r.kg).sort(d3.ascending); return { id: c.id, k: c.id.replace('MR-', 'MR '), vals: v, n: v.length, min: v[0], max: v[v.length - 1], q1: d3.quantile(v, .25), med: d3.quantile(v, .5), q3: d3.quantile(v, .75) }; });
    boxes($('#ch-box'), bx);
    const hv = cat.filter((c) => byRoute.has(c.id)).map((c) => ({ id: c.id, k: c.id.replace('MR-', 'MR ') }));
    heat($('#ch-heat'), hv, diasF, (r, d) => { const q = fr.filter((x) => x.id === r.id && x.f === d); return q.length ? sum(q, (x) => x.kg) : null; });
    const al = $('#atip'); al.replaceChildren();
    if (!atip.length) al.appendChild(el('li', '', 'Ningún registro atípico con los filtros actuales.'));
    atip.sort((a, c) => Math.abs(c.z) - Math.abs(a.z)).forEach(({ r, z, m1 }) => { const li = el('li'); li.append(el('em', '', `${dlab(r.f)} · ${r.id}`), `${nf.format(r.kg)} kg, ${z > 0 ? 'por encima' : 'por debajo'} de lo habitual (media ${nf1.format(m1)} kg, ${nf1.format(Math.abs(z))} desviaciones).`); al.appendChild(li); });
    const area = cat.slice().sort((a, b) => (b.area || 0) - (a.area || 0)).filter((c) => c.area != null);
    hBars($('#ch-area'), area.map((c) => ({ id: c.id, k: c.id.replace('MR-', 'MR '), v: c.area, sel: c.id === st.ruta, tip: [c.id, `${nf.format(c.area)} m²`, c.sector] })), { fmt: (v) => nf.format(Math.round(v)), pick, dim: !!st.ruta });

    const rows = cat.map((c) => { const d = byR.find((x) => x.id === c.id) || { kg: 0, vb: 0, vl: 0 }; const v = (byRoute.get(c.id) || []).map((r) => r.kg), av = d3.mean(v) || 0; return { id: c.id, sector: c.sector, km: c.km, area: c.area, vb: d.vb, vl: d.vl, kg: d.kg, avg: av, sd: d3.deviation(v) || 0, cv: av ? (d3.deviation(v) || 0) / av * 100 : 0, kmkg: c.km && av ? av / c.km : 0, dens: c.area ? d.kg / c.area * 1000 : 0 }; });
    const cols2 = [['id', 'Microruta'], ['sector', 'Sector'], ['km', 'Longitud (km)'], ['area', 'Área (m²)'], ['vb', 'Vías barridas'], ['vl', 'Vías limpiadas'], ['kg', 'Residuos (kg)'], ['avg', 'Media por registro'], ['sd', 'Desv. estándar'], ['cv', 'CV (%)'], ['kmkg', 'kg por km'], ['dens', 'kg por 1.000 m²']];
    const fnum = (v) => (v == null ? '—' : nf1.format(v));
    const f2 = { km: fnum, area: (v) => (v == null ? '—' : nf.format(Math.round(v))), vb: nf.format, vl: nf.format, kg: nf.format, avg: fnum, sd: fnum, cv: (v) => nf.format(Math.round(v)), kmkg: fnum, dens: fnum };
    rows.sort((a, b) => (typeof a[st.sort] === 'string' ? a[st.sort].localeCompare(b[st.sort]) : (a[st.sort] || 0) - (b[st.sort] || 0)) * st.dir);
    const thead = $('#tb thead'); thead.replaceChildren();
    const trh = el('tr');
    cols2.forEach(([k, n]) => { const th = el('th', '', n + (st.sort === k ? (st.dir > 0 ? ' ▲' : ' ▼') : '')); th.setAttribute('aria-sort', st.sort === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'); th.addEventListener('click', () => { st.dir = st.sort === k ? -st.dir : (k === 'id' || k === 'sector' ? 1 : -1); st.sort = k; draw(); }); trh.appendChild(th); });
    thead.appendChild(trh);
    const tb = $('#tb tbody'); tb.replaceChildren();
    rows.forEach((r) => { const tr = el('tr'); if (r.id === st.ruta) tr.className = 'sel'; tr.addEventListener('click', () => pick(r.id)); cols2.forEach(([k]) => tr.appendChild(el('td', '', f2[k] ? f2[k](r[k]) : r[k]))); tb.appendChild(tr); });

    const ob = $('#obs'); ob.replaceChildren();
    const lst = fr.filter((r) => r.obs);
    if (!lst.length) ob.appendChild(el('li', '', 'Sin observaciones en el periodo elegido.'));
    lst.forEach((r) => { const li = el('li'); li.append(el('em', '', `${dlab(r.f)} · ${r.id}`), r.obs); ob.appendChild(li); });

    const items = fr.slice().sort((a, b) => (a.f < b.f ? 1 : a.f > b.f ? -1 : a.id.localeCompare(b.id))).map((r) => ({ ...r, svc: r.id }));
    const gal = photosOf(items);
    $('#gal-b-n').textContent = `${nf.format(gal.length)} fotos en la selección. Respeta los filtros de fechas, microruta y registros.`;
    gallery($('#gal-b'), gal, 'b' + st.d0 + st.d1 + st.ruta + st.fot);
  };

  const drawLavado = () => {
    const { areas } = V;
    const nom = (id) => (areas.find((a) => a.id === id) || { nombre: id }).nombre;
    $('#lv-area').value = st.larea;
    const lavado = V.lavado.filter((r) => !st.larea || r.area === st.larea);
    kpis($('#lv-kpis'), [
      ['Jornadas de lavado', nf.format(lavado.length), 'registros válidos'],
      ['Metros cuadrados lavados', nf.format(sum(lavado, (r) => r.m2)), 'suma de las jornadas'],
      ['Áreas atendidas', nf.format(new Set(lavado.map((r) => r.area)).size), 'parques y espacios públicos'],
      ['Fotos', nf.format(sum(lavado, (r) => r.fotos.length)), 'de evidencia'],
    ]);
    const by = d3.rollups(lavado, (v) => sum(v, (r) => r.m2), (r) => r.area).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
    hBars($('#ch-lv'), by.map((d) => ({ id: d.id, k: nom(d.id).replace(/^Parque (de )?(las )?/, ''), v: d.v, tip: [nom(d.id), `${nf.format(d.v)} m²`] })), { fmt: (v) => nf.format(v), lw: 130 });
    table($('#tb-lv'), [{ h: 'Fecha', l: 1, f: (r) => dlab(r.f) }, { h: 'Área', l: 1, wrap: 1, f: (r) => nom(r.area) }, { h: 'm² lavados', f: (r) => nf.format(r.m2) }, { h: 'Operativos', f: (r) => nf.format(r.op) }], lavado.slice().sort((a, b) => (a.f < b.f ? 1 : -1)));
    gallery($('#gal-l'), photosOf(lavado.map((r) => ({ ...r, svc: nom(r.area) }))), 'l' + st.larea + st.d0 + st.d1);
  };

  const drawPoda = () => {
    const { areas } = V;
    const nom = (id) => (areas.find((a) => a.id === id) || { nombre: id }).nombre;
    $('#pd-area').value = st.parea; $('#pd-tipo').value = st.ptipo;
    const poda = V.poda.filter((r) => (!st.parea || r.area === st.parea) && (!st.ptipo || r.tipo === st.ptipo));
    kpis($('#pd-kpis'), [
      ['Jornadas de poda', nf.format(poda.length), 'registros'],
      ['Árboles podados', nf.format(sum(poda, (r) => r.arboles)), 'suma de las jornadas'],
      ['Residuos de poda', nf.format(sum(poda, (r) => r.kg)), 'kilogramos'],
      ['Fotos', nf.format(sum(poda, (r) => r.fotos.length)), 'de evidencia'],
    ]);
    table($('#tb-pd'), [{ h: 'Fecha', l: 1, f: (r) => dlab(r.f) }, { h: 'Área', l: 1, wrap: 1, f: (r) => nom(r.area) }, { h: 'Tipo', l: 1, f: (r) => r.tipo }, { h: 'Árboles', f: (r) => nf.format(r.arboles) }, { h: 'Operativos', f: (r) => nf.format(r.op) }, { h: 'Residuos (kg)', f: (r) => nf.format(r.kg) }], poda.slice().sort((a, b) => (a.f < b.f ? 1 : -1)));
    gallery($('#gal-p'), photosOf(poda.map((r) => ({ ...r, svc: nom(r.area) }))), 'p' + st.parea + st.ptipo + st.d0 + st.d1);
  };

  const drawCestas = () => {
    const cestas = V.cestas;
    const tot = sum(cestas, (r) => r.cestas);
    kpis($('#ce-kpis'), [
      ['Jornadas de limpieza', nf.format(cestas.length), 'registros'],
      ['Cestas limpiadas', nf.format(tot), 'suma de las jornadas'],
      ['Promedio por jornada', cestas.length ? nf1.format(tot / cestas.length) : '—', 'cestas'],
      ['Fotos', nf.format(sum(cestas, (r) => r.fotos.length)), 'de evidencia'],
    ]);
    const ord = cestas.slice().sort((a, b) => (a.f < b.f ? -1 : 1));
    cols($('#ch-ce'), ord.map((r) => ({ k: dlab(r.f), vals: [r.cestas] })), [{ n: 'Cestas limpiadas', c: C.vg }], (v) => nf.format(v), 'cestas');
    table($('#tb-ce'), [{ h: 'Fecha', l: 1, f: (r) => dlab(r.f) }, { h: 'Cestas limpiadas', f: (r) => nf.format(r.cestas) }, { h: 'Residuos (kg)', f: (r) => nf.format(r.kg) }], ord.slice().reverse());
    gallery($('#gal-c'), photosOf(cestas.map((r) => ({ ...r, svc: 'Limpieza de cestas' }))), 'c' + st.d0 + st.d1);
  };

  // ---------------------------------------------------------------------
  // Carga de datos y filtros globales
  // ---------------------------------------------------------------------
  function onFullData(data) {
    X = data;
    if (!$('#f-d0').options.length) {
      const dias = [...new Set([...X.barrido, ...X.lavado, ...X.poda, ...X.cestas].map((r) => r.f))].sort();
      const fillSel = (sel, arr, allLabel) => sel.append(new Option(allLabel, ''), ...arr.map(([v, n]) => new Option(n, v)));
      fillSel($('#f-d0'), dias.map((d) => [d, dlab(d)]), 'Primer día');
      fillSel($('#f-d1'), dias.map((d) => [d, dlab(d)]), 'Último día');
      fillSel($('#lx-ruta'), X.cat.map((c) => [c.id, c.id]), 'Todas');
      const usadas = (rows) => [...new Set(rows.map((r) => r.area))].map((id) => [id, (X.areas.find((a) => a.id === id) || { nombre: id }).nombre]);
      fillSel($('#lv-area'), usadas(X.lavado), 'Todas las áreas');
      fillSel($('#pd-area'), usadas(X.poda), 'Todas las áreas');
      fillSel($('#pd-tipo'), [...new Set(X.poda.map((r) => r.tipo))].filter(Boolean).map((t) => [t, t]), 'Todos');
      const on = (id, k) => $(id).addEventListener('change', (e) => { st[k] = e.target.value; if (st.d0 && st.d1 && st.d0 > st.d1) { if (k === 'd0') st.d1 = st.d0; else st.d0 = st.d1; } draw(); });
      on('#f-d0', 'd0'); on('#f-d1', 'd1'); on('#lx-ruta', 'ruta'); on('#lx-fot', 'fot'); on('#lv-area', 'larea'); on('#pd-area', 'parea'); on('#pd-tipo', 'ptipo');
      $('#lx-reset').addEventListener('click', () => { Object.assign(st, { d0: '', d1: '', ruta: '', fot: '', larea: '', parea: '', ptipo: '' }); draw(); });
    }
    draw();
  }

  function onFullDataError(err) {
    $('#lx-take').textContent = 'Error al cargar datos: ' + (err && err.message ? err.message : err);
  }

  function loadFullData() {
    google.script.run.withSuccessHandler(onFullData).withFailureHandler(onFullDataError).getFullDashboardData();
  }

  // ---------------------------------------------------------------------
  // Filtros de servidor (sin exponer operario en la vista pública) para
  // CSV, ZIP de fotos, Excel e informe DOCX — traducen el estado de los
  // filtros de la pestaña Barrido al formato que ya usan esas funciones.
  // ---------------------------------------------------------------------
  function serverFilters() {
    return { dateFrom: st.d0 || null, dateTo: st.d1 || null, microruta: st.ruta || null, operario: null, search: null };
  }

  function downloadBlob(base64, mimeType, filename) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function withBusyButton(btn, busyText, fn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = busyText;
    const done = () => { btn.disabled = false; btn.textContent = original; };
    fn(done);
  }

  function exportCsv() {
    const btn = $('#btn-exportar');
    withBusyButton(btn, 'Preparando...', (done) => {
      google.script.run
        .withSuccessHandler((data) => {
          done();
          const rows = [['Fecha', 'Microruta', 'Operario', 'Vias_Barridas', 'Vias_Limpiadas', 'Peso_Kg', 'Observacion', 'Fotos']];
          data.items.forEach((it) => {
            rows.push([it.fecha, it.microrutaLabel, it.operarioNombre, it.viasBarridas, it.viasLimpiadas,
              it.pesoKg === null ? '' : it.pesoKg, (it.observacion || '').replace(/\n/g, ' '), it.photoCount]);
          });
          const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
          const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'barrido_' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        })
        .withFailureHandler((err) => { done(); alert('Error al preparar el CSV: ' + (err && err.message ? err.message : err)); })
        .getDashboardData(serverFilters());
    });
  }

  function downloadPhotosZip() {
    const btn = $('#btn-descargar-fotos');
    withBusyButton(btn, 'Preparando ZIP...', (done) => {
      google.script.run
        .withSuccessHandler((base64) => {
          done();
          if (!base64) { alert('No hay fotos en el rango de fechas y filtros seleccionados.'); return; }
          downloadBlob(base64, 'application/zip', 'Fotos_Barrido_' + new Date().toISOString().slice(0, 10) + '.zip');
        })
        .withFailureHandler((err) => { done(); alert('Error al preparar el ZIP: ' + (err && err.message ? err.message : err)); })
        .downloadFilteredPhotosZip(serverFilters());
    });
  }

  function initInformeMes() {
    const sel = $('#f-informe-mes');
    const now = new Date();
    const opts = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push([`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, `${MES_LARGO[d.getMonth()]} ${d.getFullYear()}`]);
    }
    sel.append(...opts.map(([v, n]) => new Option(n, v)));
    sel.value = opts[0][0];
  }

  function informeMesSeleccionado() {
    const val = $('#f-informe-mes').value;
    const [y, m] = val.split('-').map(Number);
    return { year: y, month: m };
  }

  function downloadMonthlyExcel(which, btn) {
    const { year, month } = informeMesSeleccionado();
    withBusyButton(btn, 'Generando...', (done) => {
      google.script.run
        .withSuccessHandler((result) => {
          done();
          if (!result) { alert('No se pudo generar el Excel.'); return; }
          downloadBlob(result.base64, result.mimeType, result.filename);
        })
        .withFailureHandler((err) => { done(); alert('Error al generar el Excel: ' + (err && err.message ? err.message : err)); })
        .downloadMonthlyExcelReport(year, month, which);
    });
  }

  function downloadMonthlyReport(btn) {
    const { year, month } = informeMesSeleccionado();
    withBusyButton(btn, 'Generando...', (done) => {
      google.script.run
        .withSuccessHandler((result) => {
          done();
          if (!result) { alert('No se pudo generar el informe.'); return; }
          downloadBlob(result.base64, result.mimeType, result.filename);
        })
        .withFailureHandler((err) => { done(); alert('Error al generar el informe: ' + (err && err.message ? err.message : err)); })
        .downloadMonthlyReportDocx(year, month);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadFullData();
    initInformeMes();
    $('#btn-exportar').addEventListener('click', exportCsv);
    $('#btn-descargar-fotos').addEventListener('click', downloadPhotosZip);
    $('#btn-descargar-control').addEventListener('click', function () { downloadMonthlyExcel('control', this); });
    $('#btn-descargar-residuos').addEventListener('click', function () { downloadMonthlyExcel('residuos', this); });
    $('#btn-descargar-informe').addEventListener('click', function () { downloadMonthlyReport(this); });
  });
})();
