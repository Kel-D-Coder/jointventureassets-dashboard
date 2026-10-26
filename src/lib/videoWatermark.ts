import { drawWatermark, loadWatermarkLogo } from "@/lib/photoWatermark";

/**
 * A listing can have photos and at most one video. Photos always get the JVA mark; videos are,
 * for now, uploaded exactly as they were recorded (see WATERMARK_VIDEOS). When switched on, the
 * mark is burned into every frame: each frame is decoded, drawn with the mark and re-encoded, one
 * after another, using the browser's built-in video encoder (WebCodecs, through Mediabunny).
 * Nothing is played back, so no frame can be dropped. The result is an ordinary MP4 with the
 * original sound.
 *
 * The server keeps photos in a listing's `images` and the video in `videos`. The forms show them
 * in one picker, photos first so a photo stays the cover, and split them on save (splitMedia).
 */
export const MAX_VIDEO_SECONDS = 120;
export const MAX_VIDEO_MB = 100;
export const VIDEO_LIMITS = "one video, up to 2 minutes and 100 MB";

/** Off for now: videos are uploaded as they are. Set to true to burn the JVA mark into every frame again. */
const WATERMARK_VIDEOS = false;

/** Watermarked videos are at most 1080p. */
const MAX_EDGE = 1920;

/** Prepared videos waiting to be uploaded, by their blob: URL. */
const preparedVideos = new Set<string>();

export function isVideoUrl(url: string): boolean {
  return preparedVideos.has(url) || url.startsWith("data:video/") || /\.(mp4|webm|mov|m4v|mkv|ogv)(?:[?#]|$)/i.test(url);
}

/** The file ending to upload a file under, from its type: video/quicktime (iPhone videos) is .mov, not .quicktime. */
export function fileExtension(type: string, fallback = "bin"): string {
  const subtype = type.split(";")[0]!.split("/")[1] ?? "";
  const known: Record<string, string> = { quicktime: "mov", "x-m4v": "m4v", "x-matroska": "mkv", jpeg: "jpg", "svg+xml": "svg" };
  return known[subtype] ?? (subtype || fallback);
}

/** The cover: the first photo, never the video. */
export function coverOf(images: string[]): string | undefined {
  return images.find((url) => !isVideoUrl(url));
}

/** Photos first, then the video. */
export function photosThenVideo(images: string[]): string[] {
  return [...images.filter((url) => !isVideoUrl(url)), ...images.filter(isVideoUrl)];
}

/**
 * Photos for `images`, the video for `videos`. Also tidies older listings that had their video
 * saved in `images`.
 */
export function splitMedia(media: string[]): { images: string[]; videos: string[] } {
  return { images: media.filter((url) => !isVideoUrl(url)), videos: media.filter(isVideoUrl) };
}

/** A listing's photos and video as one list for the picker and the gallery. */
export function joinMedia(images: string[] = [], videos: string[] = []): string[] {
  return photosThenVideo([...images, ...videos]);
}

/** Lets go of a prepared video that was removed before upload. */
export function discardVideo(url: string): void {
  if (preparedVideos.delete(url)) URL.revokeObjectURL(url);
}

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

/** Even dimensions keep video encoders happy. */
const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

/**
 * Checks the video against the limits and returns a blob: URL for it, ready to show in the form and
 * to upload on save: the file itself, or a watermarked MP4 when WATERMARK_VIDEOS is on. `onProgress` gets 0 to 1.
 */
export async function prepareVideo(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error(`${file.name} isn't a video.`);
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_VIDEO_MB} MB. Trim or compress it, then try again.`);
  if (WATERMARK_VIDEOS) return burnWatermark(file, onProgress);

  // The length, read from the file itself (works even for videos this browser can't play, e.g. iPhone HEVC).
  const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    if (!(await input.canRead())) throw new Error(`Couldn't read ${file.name}. Try an MP4 or MOV video.`);
    const duration = await input.computeDuration();
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`${file.name} is ${minutes(duration)} long. Videos can be up to ${minutes(MAX_VIDEO_SECONDS)}.`);
    }
  } finally {
    input.dispose();
  }
  onProgress?.(1);
  const url = URL.createObjectURL(file);
  preparedVideos.add(url);
  return url;
}

/** Burns the JVA mark into every frame and returns a blob: URL for the resulting MP4. */
async function burnWatermark(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") {
    throw new Error("This browser can't prepare videos. Use the latest Chrome, Edge or Safari.");
  }

  // Loaded only when a video is added, so other pages stay light.
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeAudio, getFirstEncodableVideoCodec } =
    await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    if (!(await input.canRead())) throw new Error(`Couldn't read ${file.name}. Try an MP4 or MOV video.`);
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(`${file.name} has no video in it.`);
    const duration = await input.computeDuration();
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`${file.name} is ${minutes(duration)} long. Videos can be up to ${minutes(MAX_VIDEO_SECONDS)}.`);
    }

    // Upright size (phone videos are often stored sideways), scaled down to 1080p if bigger.
    const scale = Math.min(1, MAX_EDGE / Math.max(track.displayWidth, track.displayHeight));
    const width = even(track.displayWidth * scale);
    const height = even(track.displayHeight * scale);
    const codec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width, height });
    if (!codec) throw new Error("This browser can't create videos. Use the latest Chrome, Edge or Safari.");

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const logo = await loadWatermarkLogo();

    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      showWarnings: false,
      video: {
        width,
        height,
        fit: "fill",
        // Turn sideways phone videos upright in the frames themselves, so the mark is upright too.
        allowTransformationMetadata: false,
        codec,
        quality: QUALITY_HIGH,
        forceTranscode: true,
        processedWidth: width,
        processedHeight: height,
        process: (sample) => {
          sample.draw(ctx, 0, 0, width, height);
          drawWatermark(ctx, width, height, logo);
          return canvas;
        },
      },
      // The sound is copied over untouched when it can be; otherwise it's converted to AAC.
      audio: (await canEncodeAudio("aac")) ? { codec: "aac" } : {},
    });
    if (!conversion.isValid) throw new Error(`Couldn't prepare ${file.name}. Try an MP4 or MOV video.`);

    conversion.onProgress = (progress) => onProgress?.(Math.min(0.99, progress));
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer) throw new Error(`Couldn't add the watermark to ${file.name}.`);
    onProgress?.(1);
    const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }));
    preparedVideos.add(url);
    return url;
  } finally {
    input.dispose();
  }
}
