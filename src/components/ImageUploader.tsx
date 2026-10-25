import { useRef, useState, type DragEvent } from "react";
import { FaCloudArrowUp, FaStar, FaVideo, FaXmark } from "react-icons/fa6";
import { resizeImage } from "@/lib/image";
import { VIDEO_LIMITS, discardVideo, isVideoUrl, photosThenVideo, prepareVideo } from "@/lib/videoWatermark";
import { cx } from "@/lib/format";

/**
 * Drop zone + thumbnails for a listing's photos and its one optional video. The first photo
 * is the cover shown on cards; any photo can be promoted to cover or removed. Everything gets
 * the JVA watermark as it's added.
 */
export function ImageUploader({
  images,
  onChange,
  error,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  /** 0–1 while a video is being watermarked. */
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState("");
  const hasVideo = images.some(isVideoUrl);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem("");
    setBusy(true);
    const chosen = Array.from(files);
    const photos = chosen.filter((file) => !file.type.startsWith("video/"));
    const videos = chosen.filter((file) => file.type.startsWith("video/"));
    const problems: string[] = [];
    let current = images;

    for (const file of photos) {
      try {
        current = photosThenVideo([...current, await resizeImage(file)]);
      } catch (caught) {
        problems.push((caught as Error).message);
      }
    }
    onChange(current);

    if (videos.length && (hasVideo || videos.length > 1)) {
      problems.push(hasVideo ? "A listing can have one video. Remove the current video to add a different one." : "A listing can have one video. Choose just one.");
    }
    if (videos.length && !hasVideo) {
      setVideoProgress(0);
      try {
        current = photosThenVideo([...current, await prepareVideo(videos[0]!, setVideoProgress)]);
        onChange(current);
      } catch (caught) {
        problems.push((caught as Error).message);
      } finally {
        setVideoProgress(null);
      }
    }

    setProblem(problems.join(" "));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const makeCover = (index: number) => onChange(photosThenVideo([images[index]!, ...images.filter((_, i) => i !== index)]));
  const remove = (index: number) => {
    discardVideo(images[index]!);
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-gold bg-gold-soft/40" : error ? "border-danger/50" : "border-fg/15",
        )}
      >
        <FaCloudArrowUp aria-hidden="true" className="mx-auto h-7 w-7 text-gold-deep" />
        <p className="mt-2 text-sm font-semibold text-fg">
          {videoProgress !== null ? `Adding the watermark to your video… ${Math.round(videoProgress * 100)}%` : busy ? "Preparing photos…" : "Drag photos or a video here"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {videoProgress !== null
            ? "Keep this tab open; it takes about as long as the video plays."
            : `JPG or PNG photos, plus ${VIDEO_LIMITS}. Everything gets the JVA watermark.`}
        </p>
        {videoProgress !== null ? (
          <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-fg/10" role="progressbar" aria-valuenow={Math.round(videoProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${videoProgress * 100}%` }} />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-4 rounded-lg border border-fg/15 bg-raised px-4 py-2 text-sm font-semibold hover:border-fg/40 disabled:opacity-50"
        >
          Choose files
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => addFiles(event.target.files)} />
      </div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      {problem ? <p className="text-xs font-medium text-danger">{problem}</p> : null}

      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, index) => {
            const video = isVideoUrl(src);
            return (
              <li key={src.slice(-40) + index} className="group relative overflow-hidden rounded-xl border border-fg/8 bg-ink">
                {video ? (
                  <video src={src} controls muted playsInline preload="metadata" className="aspect-4/3 w-full object-cover" />
                ) : (
                  <img src={src} alt={`Photo ${index + 1}`} className="aspect-4/3 w-full object-cover" />
                )}
                {video ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold text-gold">
                    <FaVideo aria-hidden="true" /> Video
                  </span>
                ) : index === 0 ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold text-gold">
                    <FaStar aria-hidden="true" /> Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCover(index)}
                    className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold text-ink shadow sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={video ? "Remove the video" : `Remove photo ${index + 1}`}
                  className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-danger shadow"
                >
                  <FaXmark aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
