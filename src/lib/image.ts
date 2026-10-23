import { stampWatermark } from "@/lib/photoWatermark";

const MAX_EDGE = 1400;
const QUALITY = 0.78;

/**
 * Reads an uploaded letterhead at print quality: up to 2000px wide, keeping
 * PNG (and its transparency) as PNG. Returns a data URL.
 */
export async function readLetterhead(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image. Upload a PNG or JPG.`);
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`Couldn't read ${file.name}. Try a PNG or JPG.`);
  });
  const scale = Math.min(1, 2000 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Reads an uploaded photo, stamps the JVA watermark on it and shrinks it to a
 * JPEG data URL no wider or taller than 1400px, so a listing's photos fit in the browser's demo storage.
 * With a real backend this becomes an upload that returns the stored file's URL.
 */
export async function resizeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`Couldn't read ${file.name}. Try a JPG or PNG.`);
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  await stampWatermark(canvas);
  return canvas.toDataURL("image/jpeg", QUALITY);
}
