# Build/run Samurai Martinsville via Android Studio toolchain
# IMPORTANT: Windows path limit — use short copy at C:\om\sm-build (not Downloads\Orderly Platform\...)

$ErrorActionPreference = "Stop"
$env:ANDROID_HOME = "C:\Users\Thinkbook\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:JAVA_HOME\bin;$env:PATH"

$SRC = "C:\Users\Thinkbook\Downloads\Orderly Platform\artifacts\orderly-mobile"
$BUILD = "C:\om\sm-build"

if (-not (Test-Path $BUILD)) {
  Write-Host "Syncing project to $BUILD (short path for Gradle/CMake)..."
  New-Item -ItemType Directory -Force -Path C:\om | Out-Null
  robocopy $SRC $BUILD /E /XD android\.cxx android\app\build android\build android\.gradle .expo .git /NFL /NDL /NJH /NJS | Out-Null
}

# Sync source changes (fast)
robocopy "$SRC\src" "$BUILD\src" /E /NFL /NDL /NJH /NJS | Out-Null
robocopy "$SRC\tenants" "$BUILD\tenants" /E /NFL /NDL /NJH /NJS | Out-Null
Copy-Item "$SRC\App.tsx","$SRC\app.config.ts","$SRC\package.json" $BUILD -Force -ErrorAction SilentlyContinue

Set-Location $BUILD
node scripts/use-tenant.js samurai-martinsville

$avds = & "$env:ANDROID_HOME\emulator\emulator.exe" -list-avds
if ($avds -match "Pixel_8") {
  $devs = adb devices
  if ($devs -notmatch "emulator-\d+\s+device") {
    Start-Process "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd","Pixel_8"
    adb wait-for-device
  }
}

Write-Host "Building & installing com.orderly.samurai.martinsville ..."
npx expo run:android --port 8081

Write-Host "Open in Android Studio:"
Write-Host "  File → Open → $BUILD\android"
