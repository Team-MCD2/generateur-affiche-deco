/* ============================================================
   DecoShop — Generateur d'affiche A4 paysage
   ------------------------------------------------------------
   Une affiche par produit. Pas de planche, pas de format.
   - Lecture du formulaire en live -> #livePoster (clone du
     template #posterTemplate).
   - Mise a l'echelle de l'apercu (transform: scale) selon la
     largeur disponible : la valeur est recalculee a chaque
     resize via ResizeObserver.
   - Impression directe via window.print() (le CSS @media print
     restaure la taille reelle du poster).
   - Persistance localStorage pour conserver les saisies entre
     deux ouvertures.
   ============================================================ */

(() => {
  'use strict';

  // ----- Constantes ----------------------------------------------------------
  const STORAGE_KEY = 'decoshop_affiche_v1';
  // 297mm a 96 dpi = 297 * 96 / 25.4 = 1122.52 px (largeur reelle A4 paysage)
  const POSTER_PX_WIDTH = (297 * 96) / 25.4;

  // ----- Refs DOM ------------------------------------------------------------
  const form        = document.getElementById('labelForm');
  const previewWrap = document.getElementById('previewWrap');
  const livePoster  = document.getElementById('livePoster');
  const tplEl       = document.getElementById('posterTemplate');
  const errEl       = document.getElementById('formError');
  const btnReset    = document.getElementById('btnReset');

  if (!form || !previewWrap || !livePoster || !tplEl) {
    console.error('[affiche] DOM incomplet — verifie les ids du HTML.');
    return;
  }

  // ============================================================
  // 1) Lecture du formulaire
  // ============================================================
  function readForm() {
    const fd = new FormData(form);
    const get = (n) => (fd.get(n) ?? '').toString().trim();

    const priceRaw = get('price').replace(',', '.');
    const oldRaw   = get('oldPrice').replace(',', '.');

    return {
      name:     get('name'),
      ref:      get('ref'),
      price:    priceRaw === '' ? null : Number(priceRaw),
      oldPrice: oldRaw   === '' ? null : Number(oldRaw),
      eyebrow:  get('eyebrow'),
      pitch:    get('pitch'),
      promo:    get('promo') === 'on',
      expo:     fd.get('expo') === 'on'
    };
  }

  // ============================================================
  // 2) Validation legere (juste pour activer/desactiver Imprimer
  //    et afficher un message s'il manque l'essentiel)
  // ============================================================
  function validate(d) {
    if (!d.name) return 'Le nom du produit est obligatoire.';
    if (d.price == null || isNaN(d.price)) return 'Le prix actuel est obligatoire.';
    if (d.price < 0) return 'Le prix doit etre positif.';
    if (d.oldPrice != null && (isNaN(d.oldPrice) || d.oldPrice < 0)) {
      return 'Le prix avant promo doit etre un nombre positif.';
    }
    if (d.promo && d.oldPrice != null && d.oldPrice <= d.price) {
      return 'En mode Promotion, le prix avant promo doit etre superieur au prix actuel.';
    }
    return null;
  }

  // ============================================================
  // 3) Helpers d'affichage
  // ============================================================
  const fmtPrice = (n) =>
    Number.isInteger(n)
      ? String(n)
      : n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');

  function discountPct(oldP, currP) {
    if (!oldP || !currP || oldP <= currP) return 0;
    return Math.round(((oldP - currP) / oldP) * 100);
  }

  // ============================================================
  // 4) Construction de l'affiche dans #livePoster
  // ============================================================
  function buildPoster(data) {
    // Clone du template
    const clone = tplEl.content.firstElementChild.cloneNode(true);
    clone.id = 'livePoster';

    // Remplace le poster courant (ou l'append la 1ere fois).
    // On NE peut PAS utiliser la ref `livePoster` capturee a l'init :
    // apres un premier replaceWith elle pointe sur un noeud detache.
    const current = previewWrap.querySelector('.poster');
    if (current) current.replaceWith(clone);
    else previewWrap.appendChild(clone);

    // Modes
    clone.dataset.promo = data.promo ? 'true' : 'false';
    clone.dataset.expo  = data.expo  ? 'true' : 'false';

    // Texte editorial
    clone.querySelector('[data-eyebrow]').textContent = data.eyebrow || 'Coup de coeur';
    clone.querySelector('[data-name]').textContent    = data.name    || 'Nom du produit';
    clone.querySelector('[data-pitch]').textContent   = data.pitch   || 'Decouvrez nos nouveautes en magasin a Toulouse.';

    // Reference (cachee si absente)
    const refEl = clone.querySelector('[data-ref]');
    if (data.ref) {
      refEl.textContent = `Ref. ${data.ref}`;
      refEl.style.display = '';
    } else {
      refEl.textContent = '';
      refEl.style.display = 'none';
    }

    // Prix actuel
    clone.querySelector('[data-price]').textContent =
      data.price != null ? fmtPrice(data.price) : '0';

    // Prix avant promo (visible seulement si data.promo + valeur)
    const oldEl = clone.querySelector('[data-old]');
    const oldBlock = oldEl.closest('.poster__old');
    if (data.promo && data.oldPrice != null && data.oldPrice > 0) {
      oldEl.textContent = fmtPrice(data.oldPrice);
      oldBlock.style.display = '';
    } else {
      oldBlock.style.display = 'none';
    }

    // Pastille -XX% (visible si promo + ancien prix > prix)
    const discEl = clone.querySelector('[data-discount]');
    const pct = discountPct(data.oldPrice, data.price);
    if (data.promo && pct > 0) {
      discEl.textContent = `-${pct}%`;
      discEl.style.display = '';
    } else {
      discEl.textContent = '';
      discEl.style.display = 'none';
    }

    // Footer mode (texte adapte si expo)
    const modeEl = clone.querySelector('[data-mode]');
    if (modeEl) modeEl.textContent = data.expo ? 'Modele expose' : 'En magasin';
  }

  // ============================================================
  // 5) Mise a l'echelle de l'apercu (le poster fait 297mm de
  //    large, on le scale pour rentrer dans previewWrap)
  // ============================================================
  function applyPreviewScale() {
    const wrapW = previewWrap.clientWidth;
    if (!wrapW) return;
    const scale = wrapW / POSTER_PX_WIDTH;
    const poster = previewWrap.querySelector('.poster');
    if (!poster) return;
    poster.style.transform = `scale(${scale})`;
  }

  let resizeRO;
  function watchPreviewResize() {
    if ('ResizeObserver' in window) {
      resizeRO = new ResizeObserver(() => applyPreviewScale());
      resizeRO.observe(previewWrap);
    } else {
      window.addEventListener('resize', applyPreviewScale);
    }
  }

  // ============================================================
  // 6) Render complet (lecture + validation + build + scale)
  // ============================================================
  function render() {
    const data = readForm();
    const err  = validate(data);

    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
    } else {
      errEl.textContent = '';
      errEl.hidden = true;
    }

    // On reconstruit l'affiche meme avec une erreur (preview live)
    // Si pas de nom/prix on injecte des valeurs par defaut visuellement.
    const safe = {
      ...data,
      name:  data.name  || 'Nom du produit',
      price: data.price != null && !isNaN(data.price) ? data.price : 0
    };
    buildPoster(safe);
    applyPreviewScale();
  }

  // ============================================================
  // 7) Persistance localStorage (multi-onglets safe)
  // ============================================================
  function saveState() {
    const data = readForm();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) { /* quota / private mode : on ignore */ }
  }

  function loadState() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) { return; }
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    if (!data || typeof data !== 'object') return;

    // Reinjecte dans le formulaire
    const setVal = (name, val) => {
      const el = form.elements.namedItem(name);
      if (!el) return;
      if (el instanceof RadioNodeList) {
        for (const radio of el) radio.checked = radio.value === String(val);
      } else if (el.type === 'checkbox') {
        el.checked = !!val;
      } else {
        el.value = val == null ? '' : val;
      }
    };

    setVal('name',     data.name);
    setVal('ref',      data.ref);
    setVal('price',    data.price);
    setVal('oldPrice', data.oldPrice);
    setVal('eyebrow',  data.eyebrow);
    setVal('pitch',    data.pitch);
    setVal('promo',    data.promo ? 'on' : 'off');
    setVal('expo',     data.expo);
  }

  // ============================================================
  // 8) Wiring evenements
  // ============================================================
  function init() {
    loadState();
    render();
    watchPreviewResize();

    // Render live a chaque changement
    form.addEventListener('input',  () => { saveState(); render(); });
    form.addEventListener('change', () => { saveState(); render(); });

    // Submit -> impression directe
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = readForm();
      const err  = validate(data);
      if (err) {
        errEl.textContent = err;
        errEl.hidden = false;
        return;
      }
      // Petit timeout pour laisser le DOM se stabiliser apres un focus
      setTimeout(() => window.print(), 60);
    });

    // Reset -> on re-render avec valeurs vides + on efface le storage
    btnReset?.addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      // setTimeout pour laisser le form HTML se reset avant relecture
      setTimeout(render, 0);
    });

    // Sync multi-onglets : si le storage change ailleurs, on reflete
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        loadState();
        render();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
