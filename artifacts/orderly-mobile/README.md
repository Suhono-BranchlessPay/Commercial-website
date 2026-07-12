# Orderly Mobile — Samurai Martinsville (pilot Android)

White-label Opsi B. Satu codebase; app branded per lokasi.

**Prioritas aktif:** see repo `docs/ORDERLY_SUMBER_KEBENARAN.md` §3 P1 and `docs/P1_MOBILE_TRANSACTION_EVIDENCE.md`.

## Dua lokasi Samurai (jangan tertukar)

| App variant (`tenants/`) | Store name | Backend slug | Package |
|--------------------------|------------|--------------|---------|
| **samurai-martinsville** (pilot) | Samurai Martinsville | `samurai` → samurairesto.com | `com.orderly.samurai.martinsville` |
| **samurai-linton** (nanti) | Samurai Linton | `samurai-linton` (TBD) | `com.orderly.samurai.linton` |

## Jalankan Android (Martinsville)

```bash
cd artifacts/orderly-mobile
npm ci
npm run tenant:martinsville
npx expo start --android
```

Butuh Android Studio emulator atau device USB + Expo Go (sandbox card nonce).

## Build APK preview (EAS) — kirim ke Malik

```bash
npm i -g eas-cli
eas login
npm run tenant:martinsville
eas build -p android --profile preview
```

Kirim link unduhan EAS / file APK ke Malik (HP fisik). Jangan commit APK atau signing key.

**Catatan P1:** profile `preview` memakai sandbox test nonce. Bukti kartu sungguhan butuh Square In-App Payments SDK + build tanpa `EXPO_PUBLIC_SQUARE_TEST_NONCE` (perubahan jalur bayar → butuh review manusia dulu).

## Aset Martinsville

Logo + 12 foto menu dari `Samurai Project` / storefront public.

## Keamanan

- Tidak ada secret Square/BP/Stripe di app — hanya public `applicationId` dari `/api/square/config`.
- `.env` lokal di-gitignore. Pakai `.env.example` sebagai template.
