import { lazy, Suspense } from "react";
import "react-quill-new/dist/quill.snow.css";
import { cx } from "@/lib/format";
import { isBlankRichText, normalSpaces, toEditorHtml } from "@/lib/richText";

// The editor is large, so it loads only on pages that use it.
const ReactQuill = lazy(() => import("react-quill-new"));

const modules = {
  toolbar: [[{ header: [2, 3, false] }], ["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};
const formats = ["header", "bold", "italic", "underline", "list", "link"];

/**
 * A rich text box (headings, bold, lists, links) that saves HTML. Plain text from older listings
 * loads as paragraphs. An empty editor reports "", so required checks keep working.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  invalid = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className={cx("rich-text-editor", invalid && "rich-text-editor-invalid")}>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-lg border border-fg/10 bg-surface" aria-hidden="true" />}>
        <ReactQuill
          theme="snow"
          value={toEditorHtml(value)}
          onChange={(html) => onChange(isBlankRichText(html) ? "" : normalSpaces(html))}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </Suspense>
    </div>
  );
}
