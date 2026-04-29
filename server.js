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
const THEME_ASSETS = path.join(__dirname, '..', 'theme', 'assets');

// View engine : EJS (partials via <%- include('partials/x') %>)
app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

// Page principale rendue depuis les templates EJS
app.get('/', (req, res) => {
  res.render('index');
});

// 1) Favicon : sert le .ico officiel directement (les navigateurs requetent
//    /favicon.ico a la racine par convention). Fallback 204 si absent.
app.get('/favicon.ico', (req, res) => {
  const ico = path.join(PUBLIC_DIR, 'assets', 'favicon.ico');
  if (fs.existsSync(ico)) return res.sendFile(ico);
  res.status(204).end();
});

// 2) Assets : passe-plat vers le theme Shopify (source unique de verite en dev local).
//    Si le dossier theme/ n'est pas la (deploiement Vercel ou seul 'generateur/'
//    est embarque), on delegue a express.static qui servira la copie bundlee
//    dans public/assets/.
app.use('/assets', (req, res, next) => {
  const themeFile = path.join(THEME_ASSETS, req.path);
  if (fs.existsSync(themeFile) && fs.statSync(themeFile).isFile()) {
    return res.sendFile(themeFile);
  }
  next();
});

// 3) Serve static files (CSS, JS, public/assets/* en fallback)
//    'index: false' empeche express.static de servir un eventuel index.html
//    a la racine, pour que notre route GET / (EJS) gagne la priorite.
app.use(express.static(PUBLIC_DIR, { index: false }));

// 4) Healthcheck
app.get('/health', (req, res) => res.json({ ok: true, version: require('./package.json').version }));

// 5) 404
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
