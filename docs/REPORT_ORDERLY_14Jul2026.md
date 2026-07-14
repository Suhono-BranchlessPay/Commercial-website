# Orderly — Status Report (14 Jul 2026)

**Audience:** Verry + Malik  
**Repo:** `orderly-platform` · `main` @ `bc2e8c6`  
**Prod engine:** `samurairesto.com` (VPS `46.202.179.234`)  
**Console:** `https://orderlyfoods.com/dashboard`

---

## Verdict (satu kalimat)

Fondasi long-tail Blok 1–5 + 3.1–3.3 + Blok 4.1 sudah **merged & deployed** ke Samurai; jalur uang Samurai tidak berubah; Kirin/Linton + Stripe + C5 tetap HOLD.

---

## Ringkasan status vs instruksi 13 Jul

| Blok | Item | Status | Catatan |
|------|------|--------|---------|
| **1.1** | Gelombang 1 dashboard | ✅ LIVE | Live orders, payments/tips, customer intel, anchors — data Samurai nyata |
| **1.2** | QR dinamis `/r/:slug` | ✅ LIVE | `?src=flyer` → landing config-driven; kartu QR scans di console |
| **1.3** | Anchor monitoring | ✅ LIVE | Alert + kartu Anchor health; butuh `ORDERLY_ALERT_WEBHOOK_URL` (sudah di VPS) |
| **1.4** | Refund + anchor negatif | ✅ Diuji | Order test Android → Square refund + BP negatif OK |
| **2.1** | C1 menu Kirin/Linton | ⏸️ HOLD | Butuh foto menu dari Malik; izin Health Dept sisi klien |
| **2.2** | Storefront Kirin/Linton | ⏸️ HOLD | Sama — tidak mendesak |
| **2.3** | Go-live checklist | ✅ | `docs/GO_LIVE_CHECKLIST.md` |
| **3.1** | Self-serve + Square OAuth | ✅ LIVE (sandbox) | Authorize URL + callback + token AES-GCM; Samurai tetap env-token |
| **3.2** | Support otomatis (KB) | ✅ LIVE | Panel Support di console; escalate jika confidence rendah |
| **3.3** | Dashboard i18n (11 bahasa) | ✅ LIVE | Picker + auto-detect + RTL `ar`; th/my/ne/ar perlu review penutur asli |
| **4.1** | Social trial Samurai | ✅ LIVE (gated) | Inbox + draft + human approve; Graph send **off** default (`SOCIAL_SEND_ENABLED`) |
| **4.2** | Google Business Profile | ❌ Belum | Next backlog |
| **4.3** | Meta App Review / Publish | 📋 Ops Malik | App masih Unpublished → komentar publik Page mungkin tidak masuk |
| **5** | Multi-vertical seams | ✅ Migrated | Additive/nullable; Samurai `business_type=restaurant` tidak berubah |
| **6** | iOS / store pilot | ❌ Belum | Next backlog |
| **7** | Whitepaper / legal | 📋 Malik | Bukan kode |

---

## PR yang masuk `main` (13–14 Jul)

| PR | Judul | Merged |
|----|-------|--------|
| [#10](https://github.com/Suhono-BranchlessPay/orderly-platform/pull/10) | Blok 1: QR, anchor health, refund anchors | 13 Jul |
| [#11](https://github.com/Suhono-BranchlessPay/orderly-platform/pull/11) | Blok 4.1 social inbox trial | 14 Jul |
| [#12](https://github.com/Suhono-BranchlessPay/orderly-platform/pull/12) | Blok 3.1 Square OAuth | 14 Jul |
| [#13](https://github.com/Suhono-BranchlessPay/orderly-platform/pull/13) | Graph send (hard-gated) | 14 Jul |
| [#14](https://github.com/Suhono-BranchlessPay/orderly-platform/pull/14) | Blok 3.2/3.3 support KB + i18n | 14 Jul |

Deploy VPS terakhir: **14 Jul ~05:30 UTC** — `git reset --hard origin/main` @ `bc2e8c6`, migrasi support, build, PM2 online. Smoke: `healthz` 200, social health OK, `/dashboard/i18n.js` 200, support route mounted (401 tanpa login = benar).

---

## Yang terlihat di console sekarang

`https://orderlyfoods.com/dashboard` (setelah login Master/Manager):

- Range + tenant picker + **Language** (11 locale)
- Live orders · Anchor verification · Top items · Payments & tips
- Anchor health · QR scans · Customer intelligence
- Social inbox (trial, samurai)
- **Support assistant** + knowledge base (FAQ platform) + open escalations
- Coming soon list (jujur — tidak dikarang)

Contoh angka Samurai (saat screenshot 14 Jul): orders/sales dari data paid nyata — policy tetap: kosong = kosong, tidak invent metrik.

---

## Ops / aksi Malik (bukan kode)

1. **Square OAuth (sandbox sudah di VPS)**  
   - Redirect URI harus persis: `https://samurairesto.com/api/onboarding/square/callback`  
   - Uji: buka `authorizeUrl` dari `/square/start` (jangan buka callback URL kosong) → Allow di sandbox seller  
   - Production OAuth: belakangan, setelah sandbox OK  
   - **Jangan** timpa `SQUARE_ACCESS_TOKEN` / Location Samurai live

2. **Meta**  
   - **Publish** app (Development → Live) supaya komentar Page publik masuk webhook  
   - App Review nanti untuk Page **klien** (bukan milik sendiri)  
   - Graph send: biarkan `SOCIAL_SEND_ENABLED` **off** sampai siap smoke test terkendali

3. **i18n kualitas**  
   - Minta review penutur asli untuk **th / my / ne / ar** sebelum andalkan ke pemilik resto

4. **Kirin / Linton**  
   - Tetap HOLD sampai izin Health Dept + foto menu (C1)

5. **Secret hygiene**  
   - Jangan paste secret ke chat/git; Slack webhook yang pernah di-paste → rotate bila perlu

---

## Tetap HOLD (jangan dikerjakan sebagai “bug”)

- Kirin & Samurai Linton — izin Health Dept (sisi klien)  
- Stripe Connect / delivery / payouts — legal Orderly  
- C5 marketing SEND — consent + pengacara  
- AI Forecast cuaca / metrik palsu — kredibilitas > kelengkapan  
- Grocery penuh — hanya seam Blok 5

---

## Antrian berikutnya (setelah update baru)

Urutan usulan:

1. **Blok 4.2** — Google Business Profile skeleton (Malik pemilik lokasi)  
2. **Blok 6** — iOS EAS + aset store pilot Samurai  
3. Ops: Meta Publish + (opsional) smoke Graph send dengan gate ON sebentar  
4. Ops: Square OAuth sandbox end-to-end sampai `square.connected: true`  
5. Saat Kirin/Linton siap: C1 menu-from-photo + go-live checklist

---

## Aturan yang tetap dipegang

- Branch + PR (tidak push langsung ke `main` dari agent tanpa review)  
- Tidak commit secret  
- Tidak ubah jalur uang tanpa review manusia  
- Tidak mengarang metrik dashboard  
- AI support = **retrieval KB** + escalate; bukan LLM yang mengarang angka/saran kesehatan

---

## Dokumen terkait

- `docs/GO_LIVE_CHECKLIST.md`  
- `docs/SELF_SERVE_ONBOARDING.md`  
- `docs/BLOK4_SOCIAL_TRIAL.md`  
- `docs/BLOK3_SUPPORT_I18N.md`

---

*Laporan ini menutup gelombang kerja 13–14 Jul 2026. Lanjut coding setelah ada update / prioritas baru dari Verry/Malik.*
