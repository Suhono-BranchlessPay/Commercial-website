# Blok F — Kualitas i18n (native review)

Dashboard **11 bahasa sudah LIVE**. Blok F = **kualitas**, bukan fitur baru.

## Status kode

| Item | Status |
|------|--------|
| Locale picker + auto-detect | ✅ |
| Banner `needs_native` untuk th / my / ne / ar | ✅ |
| RTL `dir=rtl` untuk `ar` | ✅ diperkuat (topbar, panels, tables, gate) |
| Review pack CSV untuk penutur asli | ✅ `docs/i18n-review/` |

## Aksi Malik (≈1 jam per bahasa)

1. Buka folder [`docs/i18n-review/`](./i18n-review/README.md)
2. Bagikan `review-th.csv` / `review-my.csv` / `review-ne.csv` / `review-ar.csv` ke penutur asli
3. Mereka isi kolom **corrected_by_native**
4. Kirim balik ke Verry → paste ke `artifacts/api-server/public/dashboard/i18n.js`
5. Setelah OK: ubah di `LOCALES` → `review: "ok"` (banner hilang)

### Verifikasi RTL Arab (setelah login console)

1. Language → **العربية**
2. Cek: topbar, tombol, tabel angka, panel support, banner review
3. Screenshot kalau ada yang “melawan arah”

## Regenerate packs

```bash
node scripts/export-i18n-review-pack.mjs
```

## Aturan

- Jangan andalkan th/my/ne/ar ke pemilik resto sampai `review: "ok"`.
- Terjemahan salah lebih buruk daripada English.
- Jangan invent string uang/kesehatan di luar UI chrome yang sudah ada.
