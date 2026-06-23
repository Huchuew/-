import {
  configurePixelArtContext, drawPixelSprite, drawPixelSpriteCentered, drawPixelSpriteImpact,
  getImage, loadImage, preloadKeyedFrames,
} from '../assets/AssetLoader';

export {
  configurePixelArtContext, drawPixelSprite, drawPixelSpriteCentered, drawPixelSpriteImpact,
  getImage, loadImage, preloadKeyedFrames,
};

/** 픽셀아트 캔버스 — anti-aliasing 금지 */
export function applyCanvasPixelArtStyle(canvas: HTMLCanvasElement) {
  canvas.style.imageRendering = 'pixelated';
  (canvas.style as CSSStyleDeclaration & { imageRendering?: string }).imageRendering = 'crisp-edges';
}
