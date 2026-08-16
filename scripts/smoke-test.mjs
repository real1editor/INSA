#!/usr/bin/env node
// Smoke test for the NuroTewedede backend.
// Usage: node scripts/smoke-test.mjs [baseUrl]   (defaults to http://localhost:5000)
// Exits 0 if every check passes, 1 otherwise.
const base = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');

const checks = [
  ['GET  /api/health             status + db:connected', async () => {
    const r = await fetch(`${base}/api/health`);
    const body = await r.json();
    if (!r.ok) throw new Error(`status ${r.status}`);
    if (body.status !== 'ok') throw new Error(`status=${body.status}`);
    if (body.db !== 'connected') throw new Error(`db=${body.db}`);
  }],
  ['GET  /api/pools              array of pools', async () => {
    const r = await fetch(`${base}/api/pools`);
    const body = await r.json();
    if (!r.ok) throw new Error(`status ${r.status}`);
    const list = Array.isArray(body) ? body : body.pools;
    if (!Array.isArray(list)) throw new Error('response has no pools array');
  }],
  ['GET  /api/products           array of products', async () => {
    const r = await fetch(`${base}/api/products`);
    const body = await r.json();
    if (!r.ok) throw new Error(`status ${r.status}`);
    const list = Array.isArray(body) ? body : body.products;
    if (!Array.isArray(list)) throw new Error('response has no products array');
  }],
  ['GET  /api/auth/me            unauthenticated => 401', async () => {
    const r = await fetch(`${base}/api/auth/me`);
    if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
  }],
  ['POST /api/ai-assistant       missing prompt => 400 (public, rate-limited)', async () => {
    const r = await fetch(`${base}/api/ai-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
  }],
  ['GET  /api/does-not-exist     404 JSON', async () => {
    const r = await fetch(`${base}/api/does-not-exist`);
    const body = await r.json();
    if (r.status !== 404) throw new Error(`expected 404, got ${r.status}`);
    if (!body.error) throw new Error('no error field');
  }],
  ['GET  /                        index.html served', async () => {
    const r = await fetch(`${base}/`);
    const html = await r.text();
    if (!r.ok) throw new Error(`status ${r.status}`);
    if (!html.includes('NuroTewedede')) throw new Error('page does not reference the app name');
  }],
  ['GET  /tailwind.css           precompiled CSS served', async () => {
    const r = await fetch(`${base}/tailwind.css`);
    if (!r.ok) throw new Error(`status ${r.status}`);
  }],
  ['GET  /sw.js                  service worker served', async () => {
    const r = await fetch(`${base}/sw.js`);
    if (!r.ok) throw new Error(`status ${r.status}`);
  }]
];

let failed = 0;
for (const [name, fn] of checks) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}  -> ${err.message}`);
  }
}
console.log(failed === 0 ? `\nAll ${checks.length} smoke checks passed.` : `\n${failed}/${checks.length} smoke checks failed.`);
process.exit(failed === 0 ? 0 : 1);
