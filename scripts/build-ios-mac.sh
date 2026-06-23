#!/usr/bin/env bash
# Mac 전용 — iPhone 설치용 .ipa 생성
# 사용: bash scripts/build-ios-mac.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[ios] icons + web sync..."
npm run ios:icons
npm run ios:sync

echo "[ios] pod install..."
(cd ios/App && pod install)

ARCHIVE="$ROOT/ios/build/App.xcarchive"
IPA_DIR="$ROOT/release"
EXPORT_PLIST="$ROOT/scripts/ExportOptions.plist"

rm -rf "$ROOT/ios/build"
mkdir -p "$IPA_DIR"

echo "[ios] xcodebuild archive..."
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath "$ARCHIVE" \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="${APPLE_TEAM_ID:-}"

echo "[ios] export ipa..."
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$IPA_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST"

mv -f "$IPA_DIR/App.ipa" "$IPA_DIR/투닥투닥RPG.ipa" 2>/dev/null || true
echo "[ios] Done: $IPA_DIR/투닥투닥RPG.ipa (or App.ipa)"
