import { lazy, Suspense, useState } from "react";
import "react-quill-new/dist/quill.snow.css";
import { cx } from "@/lib/format";
import { isBlankRichText, normalSpaces, toEditorHtml } from "@/lib/richText";

// The editor is large, so it loads only on pages that use it.
const ReactQuill = lazy(() => import("react-quill-new"));

const modules = {
  toolbar: [[{ header: [2, 3, false] }], ["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};
/** What gets saved from the editor's HTML: "" when empty, ordinary spaces otherwise. */
const saved = (html: string) => (isBlankRichText(html) ? "" : normalSpaces(html));

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
  // What the editor last produced, exactly as it produced it. We hand that back while it still
  // matches the saved value: giving it our cleaned-up copy instead makes it reload, report a
  // change, get the cleaned copy again, and loop forever (freezing the page).
  const [lastRaw, setLastRaw] = useState("");
  const shown = lastRaw && saved(lastRaw) === value ? lastRaw : toEditorHtml(value);

  return (
    <div className={cx("rich-text-editor", invalid && "rich-text-editor-invalid")}>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-lg border border-fg/10 bg-surface" aria-hidden="true" />}>
        <ReactQuill
          theme="snow"
          value={shown}
          onChange={(html) => {
            setLastRaw(html);
            const next = saved(html);
            if (next !== value) onChange(next);
          }}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </Suspense>
    </div>
  );
}
