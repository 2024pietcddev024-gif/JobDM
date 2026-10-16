/**
 * Installs Piston language packages one at a time with long timeout.
 * Each package can take 2-10 minutes to download and install.
 * Run with: node install_all_packages.js
 */

const packages = [
  { language: 'gcc',        version: '10.2.0' },   // C/C++
  { language: 'node',       version: '18.15.0' },  // JavaScript
  { language: 'typescript', version: '5.0.3' },    // TypeScript
  { language: 'go',         version: '1.16.2' },   // Go
  { language: 'rust',       version: '1.68.2' },   // Rust
  { language: 'mono',       version: '6.12.0' },   // C#
  { language: 'kotlin',     version: '1.8.20' },   // Kotlin
  { language: 'php',        version: '8.2.3' },    // PHP
  { language: 'swift',      version: '5.3.3' },    // Swift
];

const PISTON_URL = 'http://localhost:2000/api/v2';
const INSTALL_TIMEOUT_MS = 900000; // 15 minutes per package

async function installPackage(language, version) {
  console.log(`\n[${new Date().toISOString()}] Installing ${language}@${version}...`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INSTALL_TIMEOUT_MS);
  try {
    const res = await fetch(`${PISTON_URL}/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, version }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (res.ok) {
      console.log(`  ✅ SUCCESS: ${language}@${version} installed`);
      return { ok: true, language, version, result: parsed };
    } else {
      console.log(`  ❌ FAILED (HTTP ${res.status}): ${JSON.stringify(parsed)}`);
      return { ok: false, language, version, error: parsed, status: res.status };
    }
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      console.log(`  ❌ TIMEOUT: ${language}@${version} exceeded ${INSTALL_TIMEOUT_MS/60000} minutes`);
      return { ok: false, language, version, error: 'TIMEOUT' };
    }
    console.log(`  ❌ ERROR: ${language}@${version}: ${e.message}`);
    return { ok: false, language, version, error: e.message };
  }
}

async function checkRuntimes() {
  const res = await fetch(`${PISTON_URL}/runtimes`);
  const runtimes = await res.json();
  console.log('\nInstalled runtimes after installation:');
  runtimes.forEach(r => console.log(`  - ${r.language} ${r.version}`));
  return runtimes;
}

(async () => {
  console.log('=== Piston Package Installer ===');
  console.log('Starting installation of 9 missing runtimes.');
  console.log('Each can take up to 15 minutes. Please wait...\n');

  const results = [];
  for (const pkg of packages) {
    const result = await installPackage(pkg.language, pkg.version);
    results.push(result);
  }

  console.log('\n=== INSTALLATION SUMMARY ===');
  results.forEach(r => {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.language}@${r.version}: ${r.ok ? 'OK' : (typeof r.error === 'object' ? JSON.stringify(r.error) : r.error)}`);
  });

  await checkRuntimes();
})();
