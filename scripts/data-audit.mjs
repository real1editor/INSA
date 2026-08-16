#!/usr/bin/env node
// NuroTewedede data-integrity audit (read-only).
// Usage: node scripts/data-audit.mjs [baseUrl]   (defaults to http://localhost:5000)
//
// Verifies the public data layer is reachable and reports row counts.
// Row-level security (RLS) on reservations / profiles / vouchers can only be
// confirmed from the Supabase dashboard (SQL editor) — see backend/migrations.sql.
const base = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');

const get = async (path) => {
  const r = await fetch(`${base}${path}`);
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
};

try {
  const health = await get('/api/health');
  const poolsBody = await get('/api/pools');
  const productsBody = await get('/api/products');
  const pools = Array.isArray(poolsBody) ? poolsBody : poolsBody.pools || [];
  const products = Array.isArray(productsBody) ? productsBody : productsBody.products || [];

  console.log(`Database:      ${health.db}`);
  console.log(`Pools:         ${pools.length}`);
  console.log(`Products:      ${products.length}`);

  const withImage = pools.filter((p) => (p.image_url || '').trim() !== '').length;
  const incomplete = pools.filter((p) => !(p.title || '').trim() || !(p.town || '').trim() || !(p.organizer || '').trim()).length;
  console.log(`Pools w/ image:${withImage}`);
  console.log(`Pools missing title/town/organizer: ${incomplete}`);

  const statuses = {};
  for (const p of pools) statuses[p.status || '(none)'] = (statuses[p.status || '(none)'] || 0) + 1;
  console.log(`Pool statuses: ${JSON.stringify(statuses)}`);

  console.log('\nRLS check (manual, needs Supabase dashboard): run backend/migrations.sql');
  console.log('in the SQL editor, then confirm policies exist for reservations, profiles, vouchers.');
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}
