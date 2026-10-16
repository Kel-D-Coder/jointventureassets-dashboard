import type { DocumentTemplate, TemplateBlock, TemplateField } from "@/data/templates";

export type TemplateValues = Record<string, string>;

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/** "2026-10-13" -> "13 October 2026" */
function longDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function initialValues(template: DocumentTemplate): TemplateValues {
  const today = new Date().toISOString().slice(0, 10);
  return Object.fromEntries(
    template.fields.map((field) => [field.key, field.defaultValue === "today" ? today : (field.defaultValue ?? "")]),
  );
}

function fieldMap(template: DocumentTemplate): Map<string, TemplateField> {
  return new Map(template.fields.map((field) => [field.key, field]));
}

/** What a placeholder shows: the value (dates written out), "[Label]" while it's empty, or a blank line if optional. */
function display(field: TemplateField | undefined, key: string, values: TemplateValues): Segment {
  const value = values[key]?.trim() ?? "";
  if (!value && field?.optional) return { text: "__________" };
  if (!value) return { text: `[${field?.label ?? key}]`, filled: false };
  return { text: field?.kind === "date" ? longDate(value) : value, filled: true };
}

export interface Segment {
  text: string;
  /** Undefined for fixed template wording; true/false for a placeholder. */
  filled?: boolean;
}

/** Splits template text into fixed wording and filled-in placeholders, for highlighting. */
export function segments(template: DocumentTemplate, text: string, values: TemplateValues): Segment[] {
  const fields = fieldMap(template);
  const parts: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push(display(fields.get(match[1]!), match[1]!, values));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/**
 * Whether a line is worth showing: false when every placeholder in it is an
 * empty optional field (e.g. a letterhead's phone number nobody typed).
 */
export function hasContent(template: DocumentTemplate, text: string, values: TemplateValues): boolean {
  const fields = fieldMap(template);
  const keys = [...text.matchAll(PLACEHOLDER)].map((match) => match[1]!);
  return keys.length === 0 || keys.some((key) => values[key]?.trim() || !fields.get(key)?.optional);
}

export function fill(template: DocumentTemplate, text: string, values: TemplateValues): string {
  return segments(template, text, values).map((part) => part.text).join("");
}

function blockTexts(block: TemplateBlock): string[] {
  switch (block.kind) {
    case "letterhead":
      return ["{{companyName}}", "{{companyAddress}}", "{{companyEmail}}"];
    case "address":
      return block.lines;
    case "clauses":
      return block.items.flatMap((item) => [item.title, item.text]);
    case "bullets":
      return block.items;
    case "signatures":
      return block.parties.flatMap((party) => [party.heading, ...party.lines]);
    case "fillIn":
      return block.parties.flatMap((party) => [party.heading ?? "", ...party.fields]);
    case "partyLetterhead":
      return [block.name, ...block.details];
    default:
      return [block.text];
  }
}

/** Fields the document uses that are still empty. */
export function emptyFields(template: DocumentTemplate, values: TemplateValues): TemplateField[] {
  const used = new Set(template.blocks.flatMap(blockTexts).flatMap((text) => [...text.matchAll(PLACEHOLDER)].map((m) => m[1]!)));
  return template.fields.filter((field) => !field.optional && used.has(field.key) && !values[field.key]?.trim());
}

/** "NDA - Capitol Real Estate Fund.docx" */
export function fileName(template: DocumentTemplate, values: TemplateValues, extension: string): string {
  const who = (values.recipientName || values.clientName || values.landownerName || "").replace(/[\\/:*?"<>|]/g, "").trim();
  return `${template.short}${who ? ` - ${who}` : ""}.${extension}`;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
