/** Faint JVA logo + web address placed behind documents that carry a watermark. */

const WEBSITE = "www.jointventureassets.com";
/** How strongly the watermark shows; low enough that body text stays easy to read. */
const STRENGTH = 0.10;

let cached: Promise<string> | null = null;

/** The logo's visible area, ignoring the transparent padding around it in logo.png. */
function visibleBounds(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let top = height, left = width, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 24) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }
  return right > left ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 } : { x: 0, y: 0, w: width, h: height };
}

/** A PNG data URL of the faded watermark, drawn once and reused. */
export function watermarkDataUrl(): Promise<string> {
  cached ??= (async () => {
    const logo = new Image();
    logo.src = "/logo.png";
    await logo.decode();
    const crop = visibleBounds(logo);

    const width = 1200;
    const logoHeight = Math.round((crop.h / crop.w) * width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = logoHeight + 150;
    const ctx = canvas.getContext("2d")!;
    ctx.globalAlpha = STRENGTH;
    ctx.drawImage(logo, crop.x, crop.y, crop.w, crop.h, 0, 0, width, logoHeight);
    ctx.font = "600 72px Manrope, ui-sans-serif, sans-serif";
    ctx.fillStyle = "#7a5c14";
    ctx.textAlign = "center";
    ctx.fillText(WEBSITE, width / 2, logoHeight + 115);
    return canvas.toDataURL("image/png");
  })();
  return cached;
}
