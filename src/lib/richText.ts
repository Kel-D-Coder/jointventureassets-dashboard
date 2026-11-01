import DOMPurify from "dompurify";

/**
 * Listing descriptions are written in a rich text editor and saved as HTML. Older ones are plain
 * text, so everything here accepts both.
 */

/** True when the text holds HTML tags (from the editor) rather than plain text. */
export const isRichText = (text: string) => /<\/?[a-z][\s\S]*?>/i.test(text);

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** HTML the editor can load: rich text as it is; plain text with each line as its own paragraph. */
export function toEditorHtml(text: string): string {
  if (!text) return "";
  if (isRichText(text)) return normalSpaces(text);
  return text
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
    .join("");
}

/**
 * The editor saves every space as a non-breaking one (a Quill bug), so the text can't wrap and
 * pushes the page sideways. Turns them back into ordinary spaces.
 */
export const normalSpaces = (html: string) => html.replace(/&nbsp;|\u00a0/g, " ");

/** True when there's no actual text, e.g. the editor's empty "<p><br></p>". */
export const isBlankRichText = (text: string) =>
  !text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

/** A description as safe HTML to show (only the editor's formatting is kept). */
export const cleanRichText = (text: string) =>
  DOMPurify.sanitize(toEditorHtml(text), {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

/** A description as plain text, one paragraph per line, e.g. for documents made from templates. */
export function richTextToPlain(text: string): string {
  if (!isRichText(text)) return text;
  const html = cleanRichText(text).replace(/<\/(p|h2|h3|li|blockquote)>|<br\s*\/?>/gi, "$&\n");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
