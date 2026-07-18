# Audit Instruksi Job Orderly — 18 Jul 2026

**Tujuan:** cek semua BLOK / Instruksi yang masih terbuka, selesaikan yang bisa sekarang, dan pisahkan yang sengaja HOLD / menunggu pihak ketiga.

**VPS HEAD setelah audit:** `e3ea0ce` (PR #62 SEO + KDS #78 + social #75–#77)  
**Probes:** `/api/healthz` 200 · `/api/readyz` 200 · `/api/kitchen/estimate` 200 · `/kds` `/client` 200

---

## Verdict

**Hampir semua foundation kode instruksi Orderly sudah LIVE di `main`.**  
Hari ini yang masih “open” dan bisa ditutup sudah dikerjakan: merge SEO polish, kirim email daily-report trial, nyalakan cron, deploy VPS, tutup PR duplikat.

Sisa terbuka = **ops Malik / Apple / Google / HOLD legal** — bukan utang kode foundation.

---

## Yang diselesaikan hari ini (18 Jul)

| Item | Aksi | Hasil |
|------|------|--------|
| PR #62 SEO tag polish | Merge squash | ✅ di `main` + deployed VPS |
| PR #73 daily-report i18n draft | Close (duplikat #72) | ✅ closed |
| Daily Report Fase 1 email trial | `POST …/daily-report/run` | ✅ `emailed=true` id `50d49aca-…` → `samurairesromartins@gmail.com` |
| Daily Report cron 4am | `DAILY_REPORT_ENABLED=1` (fix duplikat key di ecosystem) | ✅ effective `1` |
| VPS deploy | pull `main` + rebuild api + storefront | ✅ `e3ea0ce` |
| Health probes | Path yang benar = `/api/healthz` & `/api/readyz` | ✅ 200 (bukan bare `/healthz`) |
| KDS foundation | sudah LIVE sebelumnya hari ini | ✅ lihat `REPORT_KDS_PROGRESS_18Jul2026.md` |

---

## Matriks instruksi (ringkas)

### ✅ Selesai / LIVE (jangan dikerjakan ulang)

| Instruksi | Spec | Status |
|-----------|------|--------|
| Blok A Square menu sync | `BLOK_A_SQUARE_MENU_SYNC.md` | LIVE |
| Blok 3 Support + i18n | `BLOK3_SUPPORT_I18N.md` | LIVE |
| Blok B activate slice | `BLOK_B_SELF_SERVE_FINISH.md` | code LIVE; DNS/logo later |
| Blok C1 attribution code | `BLOK_C1_GOOGLE_ORDER_ONLINE.md` | code LIVE |
| Blok D social + UTM | `BLOK_D_SOCIAL.md` | LIVE gated (`SOCIAL_SEND=0`) |
| Blok 4.1 Social trial | `BLOK4_SOCIAL_TRIAL.md` | LIVE E2E comments |
| Blok 4.2 GBP code | `BLOK4_GBP_TRIAL.md` | code LIVE |
| Dashboard redesign | `INSTRUKSI_Dashboard_Redesign_14Jul2026.md` | MERGED |
| Client + KDS foundation | `BLOK_CLIENT_KDS_FOUNDATION.md` | LIVE 18 Jul |
| Blok E Mobile UX | `BLOK_E_MOBILE_UX.md` | MERGED |
| Blok F packs | `BLOK_F_I18N_NATIVE_REVIEW.md` | packs LIVE; native fill ops |
| SEO foundation + polish | `SEO_PROGRAMMATIC.md` + #62 | LIVE |
| Tests / monitoring | PR #54–#56 | LIVE |
| Daily Report Fase 1 | `INSTRUKSI_Verry_Daily_Report_Phase1.md` | **email + cron LIVE** |
| Social inbox P0–P2 | PR #75–#77 | LIVE |
| Mobile Phase 4 readiness | `INSTRUKSI_Verry_Mobile_Phase4_Submission.md` | MERGED |

### ⏳ Ops / pihak ketiga (bukan bug kode)

| Item | Owner | Catatan |
|------|-------|---------|
| **GBP Order Online URL** (C1) | Malik | Paste `https://samurairesto.com/menu?utm_source=google&utm_medium=gbp_order_online&utm_campaign=samurai` di Google Business Profile |
| **Meta Graph send smoke** (D1) | Malik | Sengaja `SOCIAL_SEND_ENABLED=0`. Nyalakan singkat → Approve→Send 1 uji → matikan lagi |
| **Meta App Publish / Advanced Access** | Malik / Meta | Ops portal |
| **GBP review API allow-list** | Google | Kode siap; ⛔ sampai Google approve |
| **Blok 0 OWNER_PIN rotate** | Malik | PIN lama pernah di git history — ganti di VPS lalu restart |
| **Blok F native review** | Penutur asli | Isi CSV `corrected_by_native` |
| **iOS TestFlight submit** | Apple / EAS | Build **1.0.0 (10)** EAS `FINISHED`; `eas submit` dari mesin ini gagal hari ini (error generik ASC). Cek App Store Connect / Expo submission log; resubmit dari akun yang punya akses ASC |
| **KDS custom alarm sound** | nanti | User: tunggu tablet dulu |
| **Self-serve OAuth Production (SISA 1)** | ditunda sengaja | Onboard manual dulu |

### ⏸️ HOLD (jangan dikerjakan sebagai bug)

- Kirin / Linton go-live  
- Stripe Connect / delivery payouts  
- C5 marketing SEND  
- Gift cards **enable** + loyalty **enable**  
- Full Big Business `/client` reporting  
- Cancel → auto-refund  
- Auto-send social “safe” categories  
- FB/IG/TikTok Shop / Meta CAPI ads as growth engine  

---

## Definisi “siap job berikutnya”

Foundation Samurai (order/pay/KDS/social draft/daily report/SEO/mobile build) **bersih**.  
Job berikutnya idealnya fokus pada:

1. Tablet KDS di dapur + fine-tune alarm  
2. iOS TestFlight internal smoke (setelah submit ASC sukses)  
3. Malik ops: GBP Order Online URL + (opsional) 1 Meta send smoke  
4. Produk berikutnya yang **bukan** HOLD (bukan Kirin/Stripe/gift enable)

---

## Catatan keamanan / env

- `SOCIAL_SEND_ENABLED` tetap **0**  
- `DAILY_REPORT_FROM` masih `onboarding@resend.dev` (Resend trial) — ganti ke domain verified bila email production  
- Client owner login: `owner@samurairesto.com` (password di ecosystem VPS, bukan git)  
- Jangan commit `ecosystem.config.cjs`
