#!/usr/bin/env node
/**
 * Zero-dependency load generator (Node 20+ global fetch).
 *
 * Keeps a fixed number of concurrent requests in flight for a fixed duration
 * and reports throughput + latency percentiles + status distribution. Useful in
 * this repo because the pnpm overrides make installing k6/autocannon awkward on
 * Windows; for richer scenarios use scripts/loadtest/k6-read-endpoints.js.
 *
 * SAFETY: only point this at SAFE, read-only endpoints on a DEV/LOCAL instance.
 * NEVER load-test POST /api/orders (real Square charge + real anchor).
 *
 * Usage:
 *   node scripts/loadtest/run.mjs --url http://127.0.0.1:4010/api/healthz \
 *     --duration 20 --concurrency 50 [--label healthz] [--header "Key: Val"]
 */

function parseArgs(argv) {
  const args = { duration: 20, concurrency: 50, method: "GET", headers: {}, label: "" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--duration") args.duration = Number(argv[++i]);
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
    else if (a === "--method") args.method = argv[++i];
    else if (a === "--label") args.label = argv[++i];
    else if (a === "--header") {
      const raw = argv[++i];
      const idx = raw.indexOf(":");
      if (idx > 0) args.headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
    }
  }
  if (!args.url) {
    console.error("ERROR: --url is required");
    process.exit(1);
  }
  return args;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function main() {
  const args = parseArgs(process.argv);
  const endAt = Date.now() + args.duration * 1000;
  const latencies = [];
  const statusCounts = new Map();
  let errors = 0;

  const bump = (k) => statusCounts.set(k, (statusCounts.get(k) ?? 0) + 1);

  async function worker() {
    while (Date.now() < endAt) {
      const t0 = performance.now();
      try {
        const res = await fetch(args.url, { method: args.method, headers: args.headers });
        // Drain the body so the connection is freed for the next request.
        await res.arrayBuffer();
        latencies.push(performance.now() - t0);
        bump(String(res.status));
      } catch (err) {
        errors++;
        bump(`ERR:${err?.code || err?.name || "unknown"}`);
      }
    }
  }

  const label = args.label || args.url;
  console.log(
    `\n▶ Load: ${label}  (${args.method} ${args.url})\n` +
      `  concurrency=${args.concurrency} duration=${args.duration}s\n`,
  );
  const startedAt = Date.now();
  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
  const elapsedS = (Date.now() - startedAt) / 1000;

  latencies.sort((a, b) => a - b);
  const total = latencies.length + errors;
  const rps = total / elapsedS;
  const fmt = (n) => `${n.toFixed(1)}ms`;

  console.log(`  requests:    ${total} in ${elapsedS.toFixed(1)}s`);
  console.log(`  throughput:  ${rps.toFixed(0)} req/s`);
  console.log(`  latency p50: ${fmt(percentile(latencies, 50))}`);
  console.log(`  latency p90: ${fmt(percentile(latencies, 90))}`);
  console.log(`  latency p95: ${fmt(percentile(latencies, 95))}`);
  console.log(`  latency p99: ${fmt(percentile(latencies, 99))}`);
  console.log(`  latency max: ${fmt(latencies[latencies.length - 1] ?? 0)}`);
  console.log(`  errors:      ${errors}`);
  console.log(`  status:      ${[...statusCounts.entries()].map(([k, v]) => `${k}=${v}`).join(" ")}`);

  const non2xx = [...statusCounts.entries()].filter(([k]) => !/^2\d\d$/.test(k));
  if (errors > 0 || non2xx.length > 0) {
    console.log(`  ⚠ non-2xx/errors present — investigate before trusting throughput`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
