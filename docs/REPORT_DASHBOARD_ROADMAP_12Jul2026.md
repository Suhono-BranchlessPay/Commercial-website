# Orderly — Status Report (Dashboard roadmap)

**Tanggal:** 12 Juli 2026  
**Untuk:** Orderly / Malik / Verry  
**Prinsip:** *we never invent metrics.*

---

## Ringkasan eksekutif

| Item | Status |
|------|--------|
| Anchor proof-back (webhook/poll) | ✅ Kode live; BP wiring callback **sedang dikerjakan BP** |
| SEAM #1 `orders.channel` | ✅ Migrasi + instrumentasi web/android |
| SEAM #2 `analytics_events` | ✅ Tabel + API + GRANT `samurai_user` |
| SEAM #3 kitchen timestamps | ✅ Kolom + stamp on create/status |
| SEAM #4 Tip checkout | ✅ Web + Android (15/18/20%/custom) |
| Gelombang 1 Live Orders | ✅ (PR ini) |
| Gelombang 1 New/Returning + Repeat + LTV/VIP | ✅ (C3 + retention stats) |
| Gelombang 1 Payment breakdown | ✅ Jujur: Square card only (tidak mengarang Apple/Google/Cash) |
| Gelombang 2 (Funnel / Channel chart / Kitchen time avg) | ⏳ Tunggu data seam terkumpul |
| Gelombang 3 Sosmed Meta/GBP | ⏳ Berikutnya (setelah G1 deploy) |
| Gelombang 4 AI forecast/insights | ❌ Ditahan — data terlalu tipis |

---

## Yang sudah di produksi (Samurai VPS)

- `main` @ PR #6 (anchor proof-back) + PR #7 (seams + tip)
- Migrasi `migrate-dashboard-seams.sql` diterapkan
- Tip UI di storefront build baru
- Analytics insert verified setelah `GRANT` ke `samurai_user`

**Anchor:** order `9cf3800a` sudah punya `chain_tx_hash` (backfill). Order lain menunggu webhook BP (poll platform key = 404 untuk pos-native Square).

---

## Gelombang 1 (PR #8 / branch ini)

Dashboard Orderly console (`orderlyfoods.com/dashboard`):

1. **Live orders** — hitungan Pending / Preparing / Ready / Completed / Cancelled + daftar order nyata  
2. **Payments & tips** — Card (Square online) + tip rate (akan naik setelah tip dipakai pelanggan)  
3. **Customer intelligence** — New / Returning / Repeat rate % / VIP / Churn-risk + tabel LTV  

Tidak dibangun: breakdown Apple Pay / Google Pay / Cash — **belum ada kolom di Orderly**. Kalau dipaksa = invent metrics.

---

## Sisa perintah Orderly (urutan berikutnya)

1. Deploy Gelombang 1 ke VPS (setelah merge)  
2. BP selesai wire `POST /api/anchor-callback` → Anchor % naik sendiri  
3. **Sosmed trial** (1 Page Samurai Martinsville, human-approve dulu) — `services/orderly-ai` + Bridge  
4. Gelombang 2 setelah ≥ beberapa minggu data `channel` + `analytics_events` + timestamps  
5. Gelombang 4 tetap hold  

---

## Verifikasi cepat pasca-deploy G1

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -H "Host: orderlyfoods.com" \
  http://127.0.0.1:8080/api/dashboard/reports/live-orders?range=7d
# expect 401 tanpa cookie (route exists) — bukan 404
```

Login console → panel Live orders + Payments & tips terlihat; angka dari DB nyata.
