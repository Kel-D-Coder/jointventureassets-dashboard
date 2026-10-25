/**
 * Stamps the JVA logo and web address across the middle of a property photo,
 * so every uploaded picture is marked as coming from Joint Venture Assets.
 * Faint enough that the property still shows clearly.
 */
const LOGO_URL = "/logo.png";
const WEBSITE = "www.jointventureassets.com";
/** How strongly the logo shows on the photo. */
const STRENGTH = 0.45;

let logo: Promise<HTMLImageElement> | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  logo ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      logo = null;
      reject(new Error("Couldn't load the JVA logo for the watermark."));
    };
    image.src = LOGO_URL;
  });
  return logo;
}

/** The logo, loaded once; null if it couldn't be loaded (the web address is still drawn). */
export function loadWatermarkLogo(): Promise<HTMLImageElement | null> {
  return loadLogo().catch(() => null);
}

export async function stampWatermark(canvas: HTMLCanvasElement): Promise<void> {
  drawWatermark(canvas.getContext("2d")!, canvas.width, canvas.height, await loadWatermarkLogo());
}

/** Draws the mark straight away, so it can run on every frame of a video (see videoWatermark.ts). */
export function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, image: HTMLImageElement | null): void {
  const logoWidth = Math.min(width * 0.42, 620);
  const logoHeight = image ? (logoWidth * image.naturalHeight) / image.naturalWidth : 0;
  const fontSize = Math.max(12, Math.round(logoWidth * 0.072));
  const blockHeight = logoHeight + fontSize * 1.6;
  const top = (height - blockHeight) / 2;

  ctx.save();
  // A soft shadow keeps the mark readable on both bright skies and dark interiors.
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = Math.round(fontSize * 0.5);
  if (image) {
    ctx.globalAlpha = STRENGTH;
    ctx.drawImage(image, (width - logoWidth) / 2, top, logoWidth, logoHeight);
  }
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(WEBSITE, width / 2, top + logoHeight + fontSize * 0.4);
  ctx.restore();
}
