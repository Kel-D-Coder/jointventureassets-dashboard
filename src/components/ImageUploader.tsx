import { useRef, useState, type DragEvent } from "react";
import { FaCloudArrowUp, FaStar, FaXmark } from "react-icons/fa6";
import { resizeImage } from "@/lib/image";
import { cx } from "@/lib/format";

/**
 * Drop zone + thumbnails for a listing's photos. The first photo is the cover
 * shown on cards; any photo can be promoted to cover or removed.
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
  const [problem, setProblem] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem("");
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await resizeImage(file));
      } catch (caught) {
        setProblem((caught as Error).message);
      }
    }
    onChange([...images, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const makeCover = (index: number) => onChange([images[index]!, ...images.filter((_, i) => i !== index)]);
  const remove = (index: number) => onChange(images.filter((_, i) => i !== index));

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
        <p className="mt-2 text-sm font-semibold text-fg">{busy ? "Preparing photos…" : "Drag photos here"}</p>
        <p className="mt-1 text-xs text-muted">JPG or PNG. Large photos are resized automatically.</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-4 rounded-lg border border-fg/15 bg-raised px-4 py-2 text-sm font-semibold hover:border-fg/40 disabled:opacity-50"
        >
          Choose photos
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => addFiles(event.target.files)} />
      </div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      {problem ? <p className="text-xs font-medium text-danger">{problem}</p> : null}

      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, index) => (
            <li key={src.slice(-40) + index} className="group relative overflow-hidden rounded-xl border border-fg/8">
              <img src={src} alt={`Photo ${index + 1}`} className="aspect-4/3 w-full object-cover" />
              {index === 0 ? (
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
                aria-label={`Remove photo ${index + 1}`}
                className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-danger shadow"
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
