/**
 * k6 load test for SAFE, read-only endpoints (industry-standard tool).
 * Install k6 (https://k6.io/docs/get-started/installation/), then:
 *
 *   BASE_URL=http://127.0.0.1:4010 TENANT=samurai k6 run scripts/loadtest/k6-read-endpoints.js
 *
 * SAFETY: read-only endpoints only, DEV/LOCAL instance only. NEVER add
 * POST /api/orders here — it triggers a real Square charge + anchor.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:4010";
const TENANT = __ENV.TENANT || "samurai";

export const options = {
  scenarios: {
    // Ramp concurrent virtual users to find the knee of the latency curve.
    ramping: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 200 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(95)<500"], // p95 under 500ms
  },
};

export default function () {
  // Liveness (no DB) — pure app/event-loop capacity.
  const health = http.get(`${BASE_URL}/api/healthz`);
  check(health, { "healthz 200": (r) => r.status === 200 });

  // DB-backed public read (tenant-scoped) — exercises the main pool.
  const menu = http.get(`${BASE_URL}/api/menu/items?tenant=${TENANT}`);
  check(menu, { "menu 2xx": (r) => r.status >= 200 && r.status < 300 });

  sleep(0.5);
}
