import { useRef, useState, type DragEvent } from "react";
import { FaCloudArrowUp, FaFileImage, FaFilePdf, FaXmark } from "react-icons/fa6";
import { documentsToUpload, listInWords } from "@/data/labels";
import { MAX_DOCUMENT_MB, toDocument } from "@/lib/files";
import { cx } from "@/lib/format";
import type { SubmittedDocument } from "@/types";

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Copies of the property's title documents (C of O, deed, survey…), so the JVA team can verify
 * ownership. Optional but recommended; only the JVA team sees them.
 */
export function SupportingDocuments({
  documents,
  onChange,
  titleDocument,
}: {
  documents: SubmittedDocument[];
  onChange: (documents: SubmittedDocument[]) => void;
  /** The titles ticked above, comma-separated: named in the prompt, with the survey plan. */
  titleDocument: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState("");
  const needed = documentsToUpload(titleDocument);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: SubmittedDocument[] = [];
    const problems: string[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await toDocument(file));
      } catch (caught) {
        problems.push((caught as Error).message);
      }
    }
    setProblem(problems.join(" "));
    onChange([...documents, ...added]);
    if (input.current) input.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
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
        className={cx("rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors", dragging ? "border-gold bg-gold-soft/40" : "border-fg/15")}
      >
        <FaCloudArrowUp aria-hidden="true" className="mx-auto h-7 w-7 text-gold-deep" />
        <p className="mt-2 text-sm font-semibold text-fg">
          Upload the {listInWords(needed)}
        </p>
        <p className="mt-1 text-xs text-muted">PDF or image, up to {MAX_DOCUMENT_MB} MB each. Only the JVA team sees them.</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-4 rounded-lg border border-fg/15 bg-raised px-4 py-2 text-sm font-semibold hover:border-fg/40"
        >
          Choose documents
        </button>
        <input ref={input} type="file" multiple hidden accept="application/pdf,image/*" onChange={(event) => void addFiles(event.target.files)} />
      </div>

      {problem ? <p className="text-xs font-medium text-danger">{problem}</p> : null}

      {documents.length ? (
        <ul className="divide-y divide-fg/8 rounded-lg border border-fg/10">
          {documents.map((doc, index) => (
            <li key={doc.name + index} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              {doc.type === "application/pdf" ? (
                <FaFilePdf aria-hidden="true" className="shrink-0 text-danger" />
              ) : (
                <FaFileImage aria-hidden="true" className="shrink-0 text-muted" />
              )}
              <span className="min-w-0 flex-1 truncate">{doc.name}</span>
              <span className="shrink-0 text-xs text-muted">{fileSize(doc.size)}</span>
              <button
                type="button"
                onClick={() => onChange(documents.filter((_, i) => i !== index))}
                aria-label={`Remove ${doc.name}`}
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"
              >
                <FaXmark aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-gold-soft/40 px-3 py-2 text-xs text-fg">
          Optional, but recommended: with the title documents on file, the team can verify ownership before the listing goes live.
        </p>
      )}
    </div>
  );
}
