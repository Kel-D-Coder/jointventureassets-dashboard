import { useRef, useState } from "react";
import { FaCloudArrowUp, FaPlay, FaXmark } from "react-icons/fa6";
import { uploadIfNeeded } from "@/lib/api";
import { cx } from "@/lib/format";

const ACCEPTED = "video/mp4,video/webm,video/quicktime,video/x-msvideo";
const MAX_MB = 200;

export function VideoUploader({
  videos,
  onChange,
}: {
  videos: string[];
  onChange: (videos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem("");
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setProblem(`${file.name} is too large. Videos must be ${MAX_MB} MB or smaller.`);
        continue;
      }
      try {
        // Create a temporary object URL so uploadIfNeeded can treat it as a data URL substitute.
        // We convert to a blob URL and immediately upload.
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const url = await uploadIfNeeded(dataUrl, file.name);
        added.push(url);
      } catch (caught) {
        setProblem((caught as Error).message);
      }
    }
    onChange([...videos, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (index: number) => onChange(videos.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div
        className={cx(
          "rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          "border-fg/15",
        )}
      >
        <FaCloudArrowUp aria-hidden="true" className="mx-auto h-7 w-7 text-gold-deep" />
        <p className="mt-2 text-sm font-semibold text-fg">{busy ? "Uploading video…" : "Add a property video"}</p>
        <p className="mt-1 text-xs text-muted">MP4, WebM or MOV · up to {MAX_MB} MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-4 rounded-lg border border-fg/15 bg-raised px-4 py-2 text-sm font-semibold hover:border-fg/40 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Choose video"}
        </button>
        <input ref={inputRef} type="file" accept={ACCEPTED} multiple hidden onChange={(e) => void addFiles(e.target.files)} />
      </div>

      {problem ? <p className="text-xs font-medium text-danger">{problem}</p> : null}

      {videos.length ? (
        <ul className="space-y-2">
          {videos.map((url, index) => (
            <li key={url.slice(-40) + index} className="flex items-center gap-3 rounded-xl border border-fg/10 bg-raised px-4 py-3">
              <FaPlay aria-hidden="true" className="shrink-0 text-gold-deep" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                Video {index + 1}
                <span className="ml-2 text-xs text-muted">{url.split("/").pop()}</span>
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-gold-deep hover:underline"
              >
                Preview
              </a>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove video ${index + 1}`}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
              >
                <FaXmark aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
