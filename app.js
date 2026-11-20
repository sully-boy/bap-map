/* BAP Project Map
   Regions are broad areas (Census city/CDP boundaries, Santa Barbara split at State St and
   Las Positas / San Roque / US-101). Projects carry only a region — never an address or point. */
(function () {
  'use strict';

  const BASEMAPS = {
    light: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors', maxZoom: 16 }),
    topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, HERE, Garmin, Intermap, © OpenStreetMap contributors, USGS, NGA, EPA, USDA, NPS', maxZoom: 16 }),
    osm: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, HERE, Garmin, USGS, © OpenStreetMap contributors, and the GIS User Community', maxZoom: 16 }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, and the GIS User Community', maxZoom: 16 }),
  };
  const EXTRA = { elsewhere: 'Beyond the South Coast' };
  const REVIEW = new URLSearchParams(location.search).has('review');

  const COLORS = { line: '#1a5f7a', fill: '#1a5f7a', active: '#c4611a' };
  const panelBody = document.getElementById('panel-body');
  const state = { regions: [], projects: [], layers: {}, labels: {}, active: null, homeBounds: null };

  // Map: zoom capped at 16 so the basemap never reaches parcel-level detail.
  const map = L.map('map', { zoomControl: false, minZoom: 10, maxZoom: 16, zoomSnap: 0.25 });
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  let current = BASEMAPS.light.addTo(map);
  document.querySelectorAll('.basemap-switch button').forEach(btn => btn.addEventListener('click', () => {
    map.removeLayer(current); current = BASEMAPS[btn.dataset.basemap].addTo(map);
    document.querySelectorAll('.basemap-switch button').forEach(b => b.classList.toggle('active', b === btn));
  }));

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inRegion = id => state.projects.filter(p => p.region === id);
  const regionName = id => (state.regions.find(r => r.id === id) || {}).name || EXTRA[id] || 'Location to confirm';
  const panelPad = () => (window.innerWidth > 720 ? [40, 40 + 392, 40, 40] : [30, 30, Math.round(window.innerHeight * 0.55), 30]);
  const fit = b => map.fitBounds(b, { paddingTopLeft: [panelPad()[3], panelPad()[0]], paddingBottomRight: [panelPad()[1], panelPad()[2]] });

  Promise.all([fetch('regions.geojson').then(r => r.json()), fetch('projects.json').then(r => r.json())])
    .then(([gj, projects]) => {
      state.projects = projects.filter(p => p.region || REVIEW).map(p => ({ ...p, region: p.region || 'unplaced' }));
      const group = L.featureGroup().addTo(map);
      gj.features.forEach(f => {
        const id = f.properties.id;
        state.regions.push({ id, name: f.properties.name });
        const layer = L.geoJSON(f, { style: styleFor(id, false) }).addTo(group);
        layer.on('click', () => openRegion(id));
        layer.on('mouseover', () => { if (state.active !== id) layer.setStyle({ fillOpacity: 0.28 }); });
        layer.on('mouseout', () => layer.setStyle(styleFor(id, state.active === id)));
        state.layers[id] = layer;
        const n = inRegion(id).length;
        const lbl = L.marker(f.properties.label, { opacity: 0, interactive: true, keyboard: false, icon: L.divIcon({ className: '', iconSize: [0, 0] }) })
          .bindTooltip(`<span class="region-label" data-id="${id}">${esc(f.properties.short || f.properties.name)}<span class="count">${n}</span></span>`,
            { permanent: true, direction: 'center', className: 'region-tip', interactive: true })
          .addTo(map);
        lbl.on('click', () => openRegion(id));
        lbl.getTooltip().on('click', () => openRegion(id));
        state.labels[id] = lbl;
      });
      state.homeBounds = group.getBounds();
      fit(state.homeBounds);
      buildChips();
      route();
    })
    .catch(err => { panelBody.innerHTML = `<div class="empty">Couldn't load the map data. ${esc(err.message)}</div>`; });

  // Label clicks (tooltips are DOM elements)
  document.getElementById('map').addEventListener('click', e => {
    const t = e.target.closest('.region-label'); if (t) openRegion(t.dataset.id);
  });

  function styleFor(id, active) {
    const empty = inRegion(id).length === 0;
    return { color: active ? COLORS.active : COLORS.line, weight: active ? 2.5 : 1.5, dashArray: empty ? '4 4' : null,
      fillColor: active ? COLORS.active : COLORS.fill, fillOpacity: active ? 0.18 : (empty ? 0.04 : 0.12) };
  }
  function setActive(id) {
    state.active = id;
    Object.entries(state.layers).forEach(([rid, layer]) => layer.setStyle(styleFor(rid, rid === id)));
    document.querySelectorAll('.region-label').forEach(n => n.classList.toggle('active', n.dataset.id === id));
  }

  function buildChips() {
    const box = document.getElementById('extra-chips'); box.innerHTML = '';
    const add = (id, cls) => {
      const n = inRegion(id).length; if (!n) return;
      const b = el('button', 'chip ' + (cls || ''), `${esc(regionName(id))} · ${n}`);
      b.addEventListener('click', () => openRegion(id)); box.appendChild(b);
    };
    add('elsewhere');
    if (REVIEW) add('unplaced', 'review');
  }

  // ── Routing (shareable links: #area/sb-east, #project/p07) ──
  window.addEventListener('hashchange', route);
  function route() {
    const [kind, id] = location.hash.replace(/^#/, '').split('/');
    if (kind === 'area' && id) return renderRegion(id);
    if (kind === 'project' && id) return renderProject(id);
    renderIndex();
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function openRegion(id) { go('#area/' + id); }

  // ── Panel views ──
  function renderIndex() {
    setActive(null);
    if (state.homeBounds) fit(state.homeBounds);
    const total = state.projects.filter(p => p.region !== 'unplaced').length;
    panelBody.innerHTML = '';
    const head = el('div', 'panel-head', `<h2>Explore our work</h2><p>${total} projects across the South Coast. Choose an area on the map or below.</p>`);
    const ul = el('ul', 'region-index');
    [...state.regions.map(r => r.id), 'elsewhere', ...(REVIEW ? ['unplaced'] : [])].forEach(id => {
      const n = inRegion(id).length; if (!n && (id === 'elsewhere' || id === 'unplaced')) return;
      const li = el('li'); const b = el('button', null, `<span>${esc(regionName(id))}</span><span class="n">${n} project${n === 1 ? '' : 's'}</span>`);
      b.addEventListener('click', () => openRegion(id)); li.appendChild(b); ul.appendChild(li);
    });
    panelBody.append(head, ul); panelBody.scrollTop = 0;
  }

  function renderRegion(id) {
    setActive(state.layers[id] ? id : null);
    if (state.layers[id]) fit(state.layers[id].getBounds());
    const list = inRegion(id);
    panelBody.innerHTML = '';
    const head = el('div', 'panel-head');
    const back = el('button', 'back', '← All areas'); back.addEventListener('click', () => go('#'));
    head.append(back, el('h2', null, esc(regionName(id))), el('p', null, list.length ? `${list.length} project${list.length === 1 ? '' : 's'}` : ''));
    panelBody.appendChild(head);
    if (!list.length) { panelBody.appendChild(el('div', 'empty', 'No featured projects in this area yet.')); return; }
    const ul = el('ul', 'project-list');
    list.forEach(p => {
      const li = el('li', 'project-row');
      li.innerHTML = `<img src="${p.thumb}" alt="" loading="lazy"><div><div class="name">${esc(p.title)}</div><div class="meta">${esc([p.type, p.year].filter(Boolean).join(' · '))}</div></div><button class="more">See more photos ›</button>`;
      li.addEventListener('click', () => go('#project/' + p.id));
      ul.appendChild(li);
    });
    panelBody.appendChild(ul); panelBody.scrollTop = 0;
  }

  function renderProject(pid) {
    const p = state.projects.find(x => x.id === pid);
    if (!p) return renderIndex();
    setActive(state.layers[p.region] ? p.region : null);
    if (state.layers[p.region]) fit(state.layers[p.region].getBounds());
    let i = 0;
    panelBody.innerHTML = '';
    const head = el('div', 'panel-head');
    const back = el('button', 'back', `← ${esc(regionName(p.region))}`); back.addEventListener('click', () => go('#area/' + p.region));
    head.append(back, el('h2', null, esc(p.title)), el('p', null, esc([p.type, p.year].filter(Boolean).join(' · '))));
    const g = el('div', 'gallery');
    const main = el('div', 'gallery-main');
    const img = el('img'); img.alt = p.title;
    const count = el('div', 'gallery-count');
    main.append(img, count);
    if (p.images.length > 1) {
      const prev = el('button', 'gallery-nav prev', '‹'); prev.setAttribute('aria-label', 'Previous photo');
      const next = el('button', 'gallery-nav next', '›'); next.setAttribute('aria-label', 'Next photo');
      prev.addEventListener('click', e => { e.stopPropagation(); show(i - 1); });
      next.addEventListener('click', e => { e.stopPropagation(); show(i + 1); });
      main.append(prev, next);
    }
    main.addEventListener('click', () => openLightbox(p.images, i));
    const strip = el('div', 'gallery-strip');
    p.images.forEach((src, k) => { const t = el('img'); t.src = src; t.alt = ''; t.loading = 'lazy'; t.addEventListener('click', () => show(k)); strip.appendChild(t); });
    g.append(main, p.images.length > 1 ? strip : el('span'), el('div', 'gallery-hint', 'Click the photo to view it full screen.'));
    panelBody.append(head, g); panelBody.scrollTop = 0;
    function show(k) {
      i = (k + p.images.length) % p.images.length;
      img.src = p.images[i]; count.textContent = `${i + 1} / ${p.images.length}`;
      [...strip.children].forEach((t, n) => t.classList.toggle('on', n === i));
    }
    show(0);
  }

  // ── Lightbox ──
  const lb = document.getElementById('lightbox'), lbImg = document.getElementById('lb-img'), lbCount = document.getElementById('lb-count');
  let lbList = [], lbI = 0;
  function openLightbox(list, k) { lbList = list; lb.hidden = false; lbShow(k); }
  function lbShow(k) { lbI = (k + lbList.length) % lbList.length; lbImg.src = lbList[lbI]; lbCount.textContent = `${lbI + 1} / ${lbList.length}`; }
  lb.querySelector('.lb-close').addEventListener('click', () => { lb.hidden = true; });
  lb.querySelector('.lb-prev').addEventListener('click', () => lbShow(lbI - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => lbShow(lbI + 1));
  lb.addEventListener('click', e => { if (e.target === lb) lb.hidden = true; });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lb.hidden = true;
    if (e.key === 'ArrowLeft') lbShow(lbI - 1);
    if (e.key === 'ArrowRight') lbShow(lbI + 1);
  });
})();
