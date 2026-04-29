/* ============================================================
   DecoShop — Generateur d'etiquettes (logique frontend)

   Stockage : localStorage (cle : 'decoshop_etiquettes')
   Chaque etiquette est un objet :
     { id, name, ref, price, oldPrice, expo }
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY        = 'decoshop_etiquettes_v1';
  const STORAGE_FORMAT_KEY = 'decoshop_etiquettes_format_v1';
  const STORAGE_ORIENT_KEY = 'decoshop_etiquettes_orient_v1';
  const STORAGE_PAPER_KEY  = 'decoshop_etiquettes_paper_v1';
  const DEFAULT_FORMAT     = 6;
  const DEFAULT_ORIENT     = 'portrait';
  const DEFAULT_PAPER      = 'white';
  const VALID_FORMATS      = [1, 2, 3, 4, 5, 6];
  const VALID_ORIENTS      = ['portrait', 'landscape'];
  const VALID_PAPERS       = ['white', 'cream', 'kraft', 'rose', 'sky', 'mint'];
  const VALID_BGS          = ['white', 'cream', 'sand', 'rose', 'sky', 'sage'];
  const VALID_ACCENTS      = ['navy', 'yellow', 'red', 'black', 'forest', 'terracotta'];
  const VALID_BADGES       = ['', 'new', 'promo', 'love', 'bio', 'local', 'exclu'];
  const VALID_ICONS        = ['', 'star', 'heart', 'flame', 'leaf', 'sparkles', 'gift', 'crown'];

  // Texte affiche dans le badge sur l'etiquette (UPPERCASE handled via CSS)
  const BADGE_LABELS = {
    'new':   'Nouveau',
    'promo': 'Promo',
    'love':  'Coup de coeur',
    'bio':   'Bio',
    'local': 'Local',
    'exclu': 'Exclu'
  };

  // Bibliotheque de SVG Lucide (inner markup, sans <svg> wrapper).
  // Utilises pour les badges et le symbole decoratif sur l'etiquette.
  const ICON_PATHS = {
    'star':     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'heart':    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
    'flame':   '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'leaf':     '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.3c1 1 1 2.4-.4 3.4-1.6 1.2-1.4 4.4 0 6 1.5 1.7 1 5.5-2 7.4-3 1.8-7 1.5-7-.4"/>',
    'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    'gift':     '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    'crown':    '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>',
    'percent':  '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    'pin':      '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    'zap':      '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
  };

  // Mapping badge -> icone affichee dans le badge
  const BADGE_ICONS = {
    'new':   'sparkles',
    'promo': 'percent',
    'love':  'heart',
    'bio':   'leaf',
    'local': 'pin',
    'exclu': 'zap'
  };

  // Helper : retourne le HTML d'un SVG Lucide complet
  function svgIcon(name, opts) {
    const path = ICON_PATHS[name];
    if (!path) return '';
    opts = opts || {};
    const fill = opts.fill || 'none';
    const stroke = opts.stroke || 'currentColor';
    const sw = opts.strokeWidth || 2;
    return '<svg viewBox="0 0 24 24" fill="' + fill + '" stroke="' + stroke +
           '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           path + '</svg>';
  }

  const FORMAT_LABELS = {
    1: '1 etiquette XL plein A4',
    2: '2 etiquettes L (1 colonne, 2 lignes)',
    3: '3 etiquettes M (1 colonne, 3 lignes)',
    4: '4 etiquettes M (2 colonnes, 2 lignes)',
    5: '5 etiquettes S (2x3, derniere centree)',
    6: '6 etiquettes S (2 colonnes, 3 lignes)'
  };

  // ============================================================
  // Selecteurs DOM
  // ============================================================
  const form               = document.getElementById('labelForm');
  const inName             = document.getElementById('f-name');
  const inRef              = document.getElementById('f-ref');
  const inPrice            = document.getElementById('f-price');
  const inOld              = document.getElementById('f-old');
  const inExpo             = document.getElementById('f-expo');
  const formError          = document.getElementById('formError');
  const btnAdd             = document.getElementById('btnAdd');
  const btnReset           = document.getElementById('btnReset');
  const btnPrint           = document.getElementById('btnPrint');
  const btnClear           = document.getElementById('btnClear');
  const livePreview        = document.getElementById('livePreview');
  const previewWrap        = document.querySelector('.preview-wrap');
  const sheetGrid          = document.getElementById('sheetGrid');
  const sheetEmpty         = document.getElementById('sheetEmpty');
  const sheetCount         = document.getElementById('sheetCount');
  const sheetMax           = document.getElementById('sheetMax');
  const sheetThumb         = document.querySelector('.sheet-thumb');
  const printArea          = document.getElementById('printArea');
  const printGrid          = document.getElementById('printGrid');
  const labelTpl           = document.getElementById('labelTemplate');
  const previewFormatLabel = document.getElementById('previewFormatLabel');
  const formatRadios       = document.querySelectorAll('input[name="format"]');
  const orientRadios       = document.querySelectorAll('input[name="orient"]');
  const paperRadios        = document.querySelectorAll('input[name="paper"]');
  const bgRadios           = document.querySelectorAll('input[name="bg"]');
  const accentRadios       = document.querySelectorAll('input[name="accent"]');
  const badgeRadios        = document.querySelectorAll('input[name="badge"]');
  const iconRadios         = document.querySelectorAll('input[name="icon"]');
  const pageStyle          = document.getElementById('pageStyle');

  // ============================================================
  // Storage helpers
  // ============================================================
  function readLabels() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }
  function writeLabels(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (_) { /* quota probably */ }
  }
  function readFormat() {
    try {
      const v = Number(localStorage.getItem(STORAGE_FORMAT_KEY));
      return VALID_FORMATS.indexOf(v) !== -1 ? v : DEFAULT_FORMAT;
    } catch (_) {
      return DEFAULT_FORMAT;
    }
  }
  function writeFormat(n) {
    try { localStorage.setItem(STORAGE_FORMAT_KEY, String(n)); }
    catch (_) {}
  }
  function readOrient() {
    try {
      const v = String(localStorage.getItem(STORAGE_ORIENT_KEY) || '');
      return VALID_ORIENTS.indexOf(v) !== -1 ? v : DEFAULT_ORIENT;
    } catch (_) {
      return DEFAULT_ORIENT;
    }
  }
  function writeOrient(o) {
    try { localStorage.setItem(STORAGE_ORIENT_KEY, String(o)); }
    catch (_) {}
  }
  function readPaper() {
    try {
      const v = String(localStorage.getItem(STORAGE_PAPER_KEY) || '');
      return VALID_PAPERS.indexOf(v) !== -1 ? v : DEFAULT_PAPER;
    } catch (_) {
      return DEFAULT_PAPER;
    }
  }
  function writePaper(p) {
    try { localStorage.setItem(STORAGE_PAPER_KEY, String(p)); }
    catch (_) {}
  }

  // ============================================================
  // Rendu d'une etiquette dans un noeud DOM
  // - data : { name, ref, price, oldPrice, expo, id? }
  // - opts : { withRemoveBtn: boolean }
  // ============================================================
  function buildLabel(data, opts) {
    opts = opts || {};
    const node = labelTpl.content.firstElementChild.cloneNode(true);

    // ID pour la suppression
    if (data.id) node.dataset.id = data.id;

    // EXPO
    if (data.expo) node.classList.add('label--expo');

    // Theme couleurs (data-bg, data-accent) avec defauts
    const bg     = VALID_BGS.indexOf(data.bg) !== -1 ? data.bg : 'white';
    const accent = VALID_ACCENTS.indexOf(data.accent) !== -1 ? data.accent : 'navy';
    node.dataset.bg = bg;
    node.dataset.accent = accent;

    // Badge (texte + icone Lucide)
    const badge = VALID_BADGES.indexOf(data.badge) !== -1 ? data.badge : '';
    node.dataset.badge = badge;
    const badgeSlot = node.querySelector('[data-badge-slot]');
    if (badgeSlot) {
      if (badge) {
        badgeSlot.innerHTML = svgIcon(BADGE_ICONS[badge]) +
                              '<span>' + (BADGE_LABELS[badge] || '') + '</span>';
      } else {
        badgeSlot.innerHTML = '';
      }
    }

    // Symbole decoratif (filigrane bottom-left)
    const icon = VALID_ICONS.indexOf(data.icon) !== -1 ? data.icon : '';
    node.dataset.icon = icon;
    const iconSlot = node.querySelector('[data-icon-slot]');
    if (iconSlot) {
      iconSlot.innerHTML = icon ? svgIcon(icon, { fill: 'currentColor', stroke: 'currentColor', strokeWidth: 1.5 }) : '';
    }

    // Nom
    const nameEl = node.querySelector('[data-name]');
    nameEl.textContent = (data.name || '').trim() || 'Nom du produit';

    // Reference
    const refEl = node.querySelector('[data-ref]');
    refEl.textContent = (data.ref || '').trim();

    // Prix
    const priceEl = node.querySelector('[data-price]');
    priceEl.textContent = formatPrice(data.price);

    // Ancien prix
    const oldEl = node.querySelector('[data-old]');
    if (data.oldPrice != null && data.oldPrice !== '' && Number(data.oldPrice) > 0) {
      oldEl.textContent = formatPrice(data.oldPrice) + ' €';
    } else {
      oldEl.textContent = '';
    }

    // Bouton supprimer (uniquement dans la planche)
    if (!opts.withRemoveBtn) {
      const rm = node.querySelector('.label__remove');
      if (rm) rm.remove();
    }

    return node;
  }

  // ============================================================
  // Format prix : 59 -> "59", 59.9 -> "59,90", 59.99 -> "59,99"
  // ============================================================
  function formatPrice(value) {
    const n = Number(value);
    if (!isFinite(n) || n <= 0) return '0';
    // Si entier : pas de decimales. Sinon 2 decimales.
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace('.', ',');
  }

  // ============================================================
  // Generation d'ID unique simple
  // ============================================================
  function genId() {
    return 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ============================================================
  // Rendu live preview (a chaque modif du form)
  // ============================================================
  function renderPreview() {
    const data = readForm();
    livePreview.innerHTML = '';
    livePreview.appendChild(buildLabel(data, { withRemoveBtn: false }));
  }

  // ============================================================
  // Rendu de la planche A4 (vignette ecran)
  // ============================================================
  function renderSheet() {
    const list = readLabels();
    const max  = getFormat();

    sheetGrid.innerHTML = '';
    list.forEach((item) => {
      sheetGrid.appendChild(buildLabel(item, { withRemoveBtn: true }));
    });

    // Vide ?
    sheetEmpty.hidden = list.length > 0;
    // Compteur
    sheetCount.textContent = String(list.length);
    if (sheetMax) sheetMax.textContent = String(max);

    // Etat des boutons
    btnPrint.disabled = list.length === 0;
    btnClear.disabled = list.length === 0;
    btnAdd.disabled   = list.length >= max;

    // Hint si plein
    if (list.length >= max) {
      showError('La planche est pleine (' + max + ' etiquette' + (max > 1 ? 's' : '') + ' max pour ce format). Imprime ou retire une etiquette pour en ajouter une nouvelle.');
    } else {
      hideError();
    }
  }

  // ============================================================
  // Lecture du formulaire en objet
  // ============================================================
  function readForm() {
    return {
      name:     inName.value || '',
      ref:      inRef.value || '',
      price:    inPrice.value === '' ? 0 : Number(inPrice.value),
      oldPrice: inOld.value === '' ? null : Number(inOld.value),
      expo:     !!inExpo.checked,
      bg:      getCheckedRadioValue('bg', 'white'),
      accent:  getCheckedRadioValue('accent', 'navy'),
      badge:   getCheckedRadioValue('badge', ''),
      icon:    getCheckedRadioValue('icon', '')
    };
  }

  // Recupere la valeur du radio coche dans le form (avec fallback)
  function getCheckedRadioValue(name, fallback) {
    const el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : (fallback != null ? fallback : '');
  }

  // ============================================================
  // Validation du formulaire
  // ============================================================
  function validate(data) {
    if (!data.name || data.name.trim().length < 2) {
      return 'Le nom du produit est obligatoire (minimum 2 caracteres).';
    }
    if (!data.price || data.price <= 0) {
      return 'Le prix actuel est obligatoire et doit etre superieur a 0.';
    }
    if (data.oldPrice != null && data.oldPrice > 0 && data.oldPrice <= data.price) {
      return 'Le prix avant promo doit etre superieur au prix actuel.';
    }
    return null;
  }

  // ============================================================
  // Affichage erreur formulaire
  // ============================================================
  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }
  function hideError() {
    formError.hidden = true;
    formError.textContent = '';
  }

  // ============================================================
  // Ajouter une etiquette a la planche
  // ============================================================
  function addLabel(e) {
    e.preventDefault();
    hideError();

    const data = readForm();
    const errMsg = validate(data);
    if (errMsg) {
      showError(errMsg);
      return;
    }

    const list = readLabels();
    const max  = getFormat();
    if (list.length >= max) {
      showError('Planche pleine (' + max + ' max). Imprime d\'abord ou change de format pour ajouter d\'autres etiquettes.');
      return;
    }

    data.id = genId();
    list.push(data);
    writeLabels(list);

    // Reset partiel : on garde EXPO et on vide le reste pour aller vite
    inName.value  = '';
    inRef.value   = '';
    inPrice.value = '';
    inOld.value   = '';
    inName.focus();

    renderPreview();
    renderSheet();
  }

  // ============================================================
  // Supprimer une etiquette (clic sur bouton X)
  // ============================================================
  function handleSheetClick(e) {
    const btn = e.target.closest('.label__remove');
    if (!btn) return;
    const labelEl = btn.closest('.label');
    if (!labelEl) return;
    const id = labelEl.dataset.id;
    if (!id) return;

    const list = readLabels().filter((it) => it.id !== id);
    writeLabels(list);
    renderSheet();
  }

  // ============================================================
  // Vider la planche (avec confirmation)
  // ============================================================
  function clearSheet() {
    if (!confirm('Vider la planche ? Toutes les etiquettes ajoutees seront supprimees.')) return;
    writeLabels([]);
    renderSheet();
  }

  // ============================================================
  // Imprimer la planche
  // ============================================================
  function printSheet() {
    const list = readLabels();
    if (list.length === 0) return;

    // Construit la grille d'impression (clone propre, sans bouton X)
    printGrid.innerHTML = '';
    list.forEach((item) => {
      printGrid.appendChild(buildLabel(item, { withRemoveBtn: false }));
    });

    // Lance l'impression
    window.print();
  }

  // Apres impression, on vide la zone print pour eviter qu'elle reste en memoire DOM
  window.addEventListener('afterprint', () => {
    printGrid.innerHTML = '';
  });

  // ============================================================
  // Reset du formulaire — on regenere aussi le preview
  // ============================================================
  function handleReset() {
    setTimeout(() => {
      hideError();
      renderPreview();
    }, 0); // setTimeout pour attendre que le reset natif soit applique
  }

  // ============================================================
  // Format de planche : lecture / application / changement
  // ============================================================

  // Lit le format actuellement coche dans le formulaire
  function getFormat() {
    const checked = form.querySelector('input[name="format"]:checked');
    if (!checked) return DEFAULT_FORMAT;
    const n = Number(checked.value);
    return VALID_FORMATS.indexOf(n) !== -1 ? n : DEFAULT_FORMAT;
  }

  // Applique la classe CSS .sheet--count-N aux 3 conteneurs visuels
  // (apercu, planche-vignette, zone d'impression). Met a jour aussi
  // les libelles d'aide.
  function applyFormat(n) {
    const targets = [previewWrap, sheetThumb, printArea].filter(Boolean);
    targets.forEach((el) => {
      VALID_FORMATS.forEach((v) => el.classList.remove('sheet--count-' + v));
      el.classList.add('sheet--count-' + n);
    });
    if (previewFormatLabel) previewFormatLabel.textContent = FORMAT_LABELS[n] || (n + ' par planche A4');
  }

  // Applique la classe CSS .orientation--portrait / .orientation--landscape
  // aux 3 conteneurs visuels + au <html> (pour que --paper-w/--paper-h
  // soient correctement herites par body en impression),
  // puis reinjecte le @page de la balise <style id="pageStyle">.
  function applyOrient(o) {
    if (VALID_ORIENTS.indexOf(o) === -1) o = DEFAULT_ORIENT;
    const root = document.documentElement;
    const targets = [previewWrap, sheetThumb, printArea, root].filter(Boolean);
    targets.forEach((el) => {
      VALID_ORIENTS.forEach((v) => el.classList.remove('orientation--' + v));
      el.classList.add('orientation--' + o);
    });
    // Met a jour la regle @page utilisee par window.print()
    if (pageStyle) pageStyle.textContent = '@page { size: A4 ' + o + '; margin: 0; }';
  }

  // Quand l'utilisateur change l'orientation
  function handleOrientChange(e) {
    const o = String(e.target.value);
    if (VALID_ORIENTS.indexOf(o) === -1) return;
    writeOrient(o);
    applyOrient(o);
    // L'orientation ne change pas la liste des etiquettes, on rerend juste pour le visuel.
    renderPreview();
    renderSheet();
  }

  // Applique data-paper sur la planche-vignette + zone d'impression.
  // Couleur globale, ne touche pas aux donnees des etiquettes.
  function applyPaper(p) {
    if (VALID_PAPERS.indexOf(p) === -1) p = DEFAULT_PAPER;
    if (sheetThumb) sheetThumb.dataset.paper = p;
    if (printArea)  printArea.dataset.paper  = p;
  }

  // Quand l'utilisateur change la couleur de planche
  function handlePaperChange(e) {
    const p = String(e.target.value);
    if (VALID_PAPERS.indexOf(p) === -1) return;
    writePaper(p);
    applyPaper(p);
  }

  // Quand l'utilisateur clique sur un radio de format
  function handleFormatChange(e) {
    const newFormat = Number(e.target.value);
    if (VALID_FORMATS.indexOf(newFormat) === -1) return;

    const list = readLabels();
    // Si on reduit le format alors qu'il y a deja trop d'etiquettes :
    // on demande confirmation pour conserver les N premieres.
    if (list.length > newFormat) {
      const keep    = newFormat;
      const removed = list.length - newFormat;
      const ok = confirm(
        'Tu as ' + list.length + ' etiquettes en planche.\n' +
        'Le format selectionne n\'en accepte que ' + keep + '.\n\n' +
        'Conserver les ' + keep + ' premieres et supprimer les ' + removed + ' dernieres ?'
      );
      if (!ok) {
        // Revert le radio sur l'ancien format
        const old = readFormat();
        const oldRadio = form.querySelector('input[name="format"][value="' + old + '"]');
        if (oldRadio) oldRadio.checked = true;
        return;
      }
      writeLabels(list.slice(0, keep));
    }

    writeFormat(newFormat);
    applyFormat(newFormat);
    renderSheet();
    renderPreview();
  }

  // ============================================================
  // Boot
  // ============================================================
  function init() {
    // 1) Charger format + orientation + couleur de planche persistes
    const savedFormat = readFormat();
    const savedOrient = readOrient();
    const savedPaper  = readPaper();
    const fRadio = form.querySelector('input[name="format"][value="' + savedFormat + '"]');
    const oRadio = form.querySelector('input[name="orient"][value="' + savedOrient + '"]');
    const pRadio = form.querySelector('input[name="paper"][value="' + savedPaper + '"]');
    if (fRadio) fRadio.checked = true;
    if (oRadio) oRadio.checked = true;
    if (pRadio) pRadio.checked = true;
    applyFormat(savedFormat);
    applyOrient(savedOrient);
    applyPaper(savedPaper);

    // 2) Branchements form
    form.addEventListener('submit', addLabel);
    form.addEventListener('reset', handleReset);
    form.addEventListener('input', renderPreview);
    form.addEventListener('change', renderPreview);
    sheetGrid.addEventListener('click', handleSheetClick);
    btnPrint.addEventListener('click', printSheet);
    btnClear.addEventListener('click', clearSheet);

    // 3) Branchements format + orientation + couleur planche
    formatRadios.forEach((radio) => radio.addEventListener('change', handleFormatChange));
    orientRadios.forEach((radio) => radio.addEventListener('change', handleOrientChange));
    paperRadios.forEach((radio)  => radio.addEventListener('change', handlePaperChange));

    // Les radios bg/accent/badge/icon sont uniquement par-etiquette : pas de
    // handler dedie, ils declenchent deja renderPreview via le 'change' du form.
    // Mais on doit aussi rerender la PLANCHE quand l'utilisateur joue avec
    // ces options ? Non, ces options ne s'appliquent qu'a la PROCHAINE etiquette
    // ajoutee. La planche affiche les etiquettes deja sauvegardees.

    // 4) Synchronisation entre onglets
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) renderSheet();
      if (e.key === STORAGE_FORMAT_KEY) {
        const f = readFormat();
        const r = form.querySelector('input[name="format"][value="' + f + '"]');
        if (r) r.checked = true;
        applyFormat(f);
        renderSheet();
        renderPreview();
      }
      if (e.key === STORAGE_ORIENT_KEY) {
        const o = readOrient();
        const r = form.querySelector('input[name="orient"][value="' + o + '"]');
        if (r) r.checked = true;
        applyOrient(o);
        renderSheet();
        renderPreview();
      }
      if (e.key === STORAGE_PAPER_KEY) {
        const p = readPaper();
        const r = form.querySelector('input[name="paper"][value="' + p + '"]');
        if (r) r.checked = true;
        applyPaper(p);
      }
    });

    // 5) Premier rendu
    renderPreview();
    renderSheet();

    // 6) Focus sur le premier champ pour aller vite
    inName.focus();
  }

  // Demarre quand le DOM est pret
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
