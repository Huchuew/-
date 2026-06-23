/**
 * 배경 PNG 2배 nearest-neighbor 업스케일 (픽셀아트 유지)
 */
import { readdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const bgDir = join(__dir, '..', 'public/assets/backgrounds');

if (!existsSync(bgDir)) {
  console.error('backgrounds folder missing — run npm run install:backgrounds first');
  process.exit(1);
}

const files = readdirSync(bgDir).filter(f => f.endsWith('.png'));
if (!files.length) {
  console.error('no PNG files in backgrounds/');
  process.exit(1);
}

const psPath = join(__dir, '_upscale_bg.ps1');
const ps = `
Add-Type -AssemblyName System.Drawing
$dir = '${bgDir.replace(/'/g, "''")}'
Get-ChildItem $dir -Filter '*.png' | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $nw = $img.Width * 2
  $nh = $img.Height * 2
  $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose(); $img.Dispose()
  $tmp = $_.FullName + '.tmp'
  $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item -Force $tmp $_.FullName
  Write-Host ('2x ' + $_.Name + ' -> ' + $nw + 'x' + $nh)
}
`;
writeFileSync(psPath, ps, 'utf8');
try {
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });
  console.log(`Upscaled ${files.length} backgrounds (2x nearest-neighbor).`);
} finally {
  try { unlinkSync(psPath); } catch { /* ignore */ }
}
