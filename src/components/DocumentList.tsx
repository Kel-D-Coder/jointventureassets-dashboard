import { FaArrowUpRightFromSquare, FaDownload, FaFilePdf } from "react-icons/fa6";
import type { SubmittedDocument } from "@/types";

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Browsers block opening data: URLs in a new tab, so uploaded files are opened as blob URLs instead. */
async function openDocument(doc: SubmittedDocument) {
  const url = doc.url.startsWith("data:") ? URL.createObjectURL(await (await fetch(doc.url)).blob()) : doc.url;
  window.open(url, "_blank", "noopener");
}

/** Uploaded documents with a preview (images) or PDF icon, and Open / Download for each. */
export function DocumentList({ documents, labels }: { documents: SubmittedDocument[]; labels?: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {documents.map((doc, index) => (
        <li key={doc.name + index} className="flex items-center gap-3 rounded-xl border border-fg/8 p-3">
          {doc.type.startsWith("image/") ? (
            <button type="button" onClick={() => void openDocument(doc)} className="shrink-0" aria-label={`Open ${doc.name}`}>
              <img src={doc.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            </button>
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-danger/8 text-2xl text-danger">
              <FaFilePdf aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {labels?.[index] ? <p className="label text-gold-deep">{labels[index]}</p> : null}
            <p className="truncate text-sm font-semibold text-fg">{doc.name}</p>
            <p className="text-xs text-muted">
              {doc.type === "application/pdf" ? "PDF" : "Image"} · {fileSize(doc.size)}
            </p>
            <div className="mt-1.5 flex gap-3 text-xs font-semibold">
              <button type="button" onClick={() => void openDocument(doc)} className="inline-flex items-center gap-1 text-gold-deep hover:underline">
                <FaArrowUpRightFromSquare aria-hidden="true" /> Open
              </button>
              <a href={doc.url} download={doc.name} className="inline-flex items-center gap-1 text-muted hover:text-fg">
                <FaDownload aria-hidden="true" /> Download
              </a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
