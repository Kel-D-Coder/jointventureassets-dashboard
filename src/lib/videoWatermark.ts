import { drawWatermark, loadWatermarkLogo } from "@/lib/photoWatermark";

/**
 * A listing can have photos and at most one video. The video gets the same JVA mark as the
 * photos, burned into every frame: the browser plays it into a canvas, draws the mark on each
 * frame and records the result (with its sound). That takes about as long as the video lasts.
 *
 * The server keeps photos in a listing's `images` and the video in `videos`. The forms show them
 * in one picker, photos first so a photo stays the cover, and split them on save (splitMedia).
 */
export const MAX_VIDEO_SECONDS = 120;
export const MAX_VIDEO_MB = 100;
export const VIDEO_LIMITS = "one video, up to 2 minutes and 100 MB";

const MAX_EDGE = 1280;
const FPS = 30;

/** Prepared videos waiting to be uploaded, by their blob: URL. */
const preparedVideos = new Set<string>();

export function isVideoUrl(url: string): boolean {
  return preparedVideos.has(url) || url.startsWith("data:video/") || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url);
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

function recordingType(): string {
  const candidates = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

/**
 * Checks the video against the limits, burns the watermark in and returns a blob: URL for the
 * result, ready to show in the form and to upload on save. `onProgress` gets 0 to 1.
 */
export async function prepareVideo(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error(`${file.name} isn't a video.`);
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_VIDEO_MB} MB. Trim or compress it, then try again.`);
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
    throw new Error("This browser can't prepare videos. Try the latest Chrome, Edge, Firefox or Safari.");
  }

  const source = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = source;
  video.playsInline = true;
  video.preload = "auto";
  let audio: AudioContext | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error(`Couldn't read ${file.name}. Try an MP4 or MOV video.`));
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error(`Couldn't read the length of ${file.name}.`);
    if (video.duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`${file.name} is ${minutes(video.duration)} long. Videos can be up to ${minutes(MAX_VIDEO_SECONDS)}.`);
    }

    // Even dimensions keep video encoders happy.
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth * scale) / 2) * 2;
    canvas.height = Math.round((video.videoHeight * scale) / 2) * 2;
    const ctx = canvas.getContext("2d")!;
    const logo = await loadWatermarkLogo();
    const stream = canvas.captureStream(FPS);

    // The sound goes into the recording only, so nothing plays out loud.
    try {
      audio = new AudioContext();
      const into = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(into);
      into.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      await audio.resume();
    } catch {
      audio = null;
    }

    const type = recordingType();
    const recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: (recorder.mimeType || type || "video/webm").split(";")[0] }));
      recorder.onerror = () => reject(new Error(`Couldn't add the watermark to ${file.name}.`));
    });

    let running = true;
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawWatermark(ctx, canvas.width, canvas.height, logo);
    };
    const next = () => {
      if (!running) return;
      if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(frame);
      else requestAnimationFrame(frame);
    };
    const frame = () => {
      if (!running) return;
      draw();
      onProgress?.(Math.min(0.99, video.currentTime / video.duration));
      next();
    };

    const ended = new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error(`${file.name} stopped playing before it finished.`));
    });

    draw();
    recorder.start(1000);
    try {
      await video.play();
    } catch {
      // The browser wouldn't play it with sound; record it silently instead.
      video.muted = true;
      await video.play();
    }
    next();
    await ended;
    running = false;
    draw();
    recorder.stop();

    const blob = await recorded;
    onProgress?.(1);
    const url = URL.createObjectURL(blob);
    preparedVideos.add(url);
    return url;
  } finally {
    URL.revokeObjectURL(source);
    video.removeAttribute("src");
    video.load();
    void audio?.close();
  }
}
