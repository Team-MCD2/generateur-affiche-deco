// ============================================================
// DecoShop — Generateur d'etiquettes de vente
// Serveur Express minimal qui sert le frontend statique.
// Le logo est servi en passe-plat depuis ../theme/assets/logo.png
// pour rester synchro avec le branding du site Shopify.
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const THEME_LOGO = path.join(__dirname, '..', 'theme', 'assets', 'logo.png');
const FALLBACK_LOGO = path.join(PUBLIC_DIR, 'logo.png');

// 1) Serve static files (HTML, CSS, JS)
app.use(express.static(PUBLIC_DIR));

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

app.listen(PORT, () => {
  console.log('');
  console.log('  DecoShop - Generateur d\'etiquettes');
  console.log('  --------------------------------------');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
  console.log('  Ctrl+C pour arreter.');
  console.log('');
});
