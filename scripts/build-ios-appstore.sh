#!/usr/bin/env bash
# Mac 전용 — App Store Connect 업로드용 .ipa
# 사용: APPLE_TEAM_ID=XXXXXXXXXX bash scripts/build-ios-appstore.sh
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
EXPORT_PLIST="$ROOT/scripts/ExportOptions-appstore.plist"

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

echo "[ios] export app-store ipa..."
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$IPA_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST"

mv -f "$IPA_DIR/App.ipa" "$IPA_DIR/투닥투닥RPG-appstore.ipa" 2>/dev/null || true
echo "[ios] Done: $IPA_DIR/투닥투닥RPG-appstore.ipa"
