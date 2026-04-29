// ============================================================
// DecoShop — Generateur d'etiquettes de vente
// Serveur Express :
//  - Rend la page principale via EJS (vues decoupees en partials).
//  - Sert les assets statiques (CSS/JS) depuis public/.
//  - Sert le logo en passe-plat depuis ../theme/assets/logo.png
//    pour rester synchro avec le branding du site Shopify.
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

const PUBLIC_DIR = path.join(__dirname, 'public');
const VIEWS_DIR  = path.join(__dirname, 'views');
const THEME_LOGO = path.join(__dirname, '..', 'theme', 'assets', 'logo.png');
const FALLBACK_LOGO = path.join(PUBLIC_DIR, 'logo.png');

// View engine : EJS (partials via <%- include('partials/x') %>)
app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

// Page principale rendue depuis les templates EJS
app.get('/', (req, res) => {
  res.render('index');
});

// 1) Serve static files (CSS, JS, assets)
//    'index: false' empeche express.static de servir un eventuel index.html
//    a la racine, pour que notre route GET / (EJS) gagne la priorite.
app.use(express.static(PUBLIC_DIR, { index: false }));

// 2) Logo: on essaie d'abord le logo du theme Shopify (source unique de verite),
//    sinon on retombe sur une copie locale dans public/.
app.get('/assets/logo.png', (req, res) => {
  if (fs.existsSync(THEME_LOGO)) {
    return res.sendFile(THEME_LOGO);
  }
  if (fs.existsSync(FALLBACK_LOGO)) {
    return res.sendFile(FALLBACK_LOGO);
  }
  res.status(404).send('Logo not found.');
});

// 3) Healthcheck
app.get('/health', (req, res) => res.json({ ok: true, version: require('./package.json').version }));

// 4) 404
app.use((req, res) => {
  res.status(404).send('Not found.');
});

// Port 0 = Node attribue automatiquement un port libre.
// On le recupere ensuite via server.address().port pour l'afficher.
const server = app.listen(0, () => {
  const { port } = server.address();
  console.log('');
  console.log('  DecoShop - Generateur d\'etiquettes');
  console.log('  --------------------------------------');
  console.log(`  http://localhost:${port}`);
  console.log('');
  console.log('  Ctrl+C pour arreter.');
  console.log('');
});
