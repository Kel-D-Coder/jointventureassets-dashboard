import { FaArrowUpRightFromSquare, FaDownload, FaFilePdf } from "react-icons/fa6";
import { downloadDocument, fileSize, openDocument } from "@/lib/documents";
import type { SubmittedDocument } from "@/types";

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
              <button type="button" onClick={() => void downloadDocument(doc)} className="inline-flex items-center gap-1 text-muted hover:text-fg">
                <FaDownload aria-hidden="true" /> Download
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
