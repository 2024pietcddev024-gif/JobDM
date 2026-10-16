// Self-contained installer that runs inside the Piston container.
// Uses the container's own node-fetch to avoid host-side timeouts.
// Does NOT require Piston's internal modules.
// Usage: docker exec piston_api node /tmp/install_inside.js

const fetch = require('/piston_api/node_modules/node-fetch');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const PISTON_URL = 'http://localhost:2000/api/v2';
const PKG_DIR = '/piston/packages';

const PACKAGES = [
  { language: 'gcc',        version: '10.2.0' },
  { language: 'node',       version: '18.15.0' },
  { language: 'typescript', version: '5.0.3' },
  { language: 'go',         version: '1.16.2' },
  { language: 'rust',       version: '1.68.2' },
  { language: 'mono',       version: '6.12.0' },
  { language: 'kotlin',     version: '1.8.20' },
  { language: 'php',        version: '8.2.3' },
  { language: 'swift',      version: '5.3.3' },
];

async function isInstalled(language, version) {
  const marker = path.join(PKG_DIR, language, version, '.piston_pkg_installed');
  return fs.existsSync(marker);
}

async function installViaApi(language, version) {
  console.log(`  POST ${PISTON_URL}/packages {language: ${language}, version: ${version}}`);
  // This call blocks until the package is fully installed inside the API server.
  // Since we're running inside the container, there's no external timeout killing us.
  const res = await fetch(`${PISTON_URL}/packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, version }),
    timeout: 0, // no timeout in node-fetch v2
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

(async () => {
  console.log('=== Self-Contained Piston Package Installer (inside container) ===');
  console.log('Started:', new Date().toISOString());

  for (const { language, version } of PACKAGES) {
    const installed = await isInstalled(language, version);
    if (installed) {
      console.log(`\n[SKIP] ${language}@${version} — already installed`);
      continue;
    }
    console.log(`\n[${new Date().toISOString()}] Installing ${language}@${version}...`);
    try {
      const result = await installViaApi(language, version);
      if (result.status === 200) {
        console.log(`  SUCCESS (${result.status}):`, JSON.stringify(result.body));
      } else if (result.status === 500 && result.body && result.body.message === 'Already installed') {
        console.log(`  ALREADY INSTALLED (API reported 500/Already installed)`);
      } else {
        console.log(`  FAILED (${result.status}):`, JSON.stringify(result.body));
      }
    } catch(e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  console.log('\n=== Final package marker status ===');
  try {
    for (const lang of fs.readdirSync(PKG_DIR)) {
      const langDir = path.join(PKG_DIR, lang);
      if (!fs.statSync(langDir).isDirectory()) continue;
      for (const ver of fs.readdirSync(langDir)) {
        const marker = path.join(langDir, ver, '.piston_pkg_installed');
        const ok = fs.existsSync(marker);
        console.log(`  [${ok ? 'INSTALLED' : 'INCOMPLETE'}] ${lang} ${ver}`);
      }
    }
  } catch(e) {
    console.log('Error reading packages dir:', e.message);
  }

  console.log('\nDone:', new Date().toISOString());
  process.exit(0);
})();
