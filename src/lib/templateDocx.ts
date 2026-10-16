/**
 * Word (.docx) export for document templates. Kept apart from lib/templates.ts
 * so the docx library is only downloaded when someone clicks "Download Word".
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
} from "docx";
import type { DocumentTemplate, TemplateBlock } from "@/data/templates";
import { fill, hasContent, type TemplateValues } from "@/lib/templates";
import { watermarkDataUrl } from "@/lib/watermark";

const GOLD_DEEP = "7A5C14";

function lines(text: string, options: { bold?: boolean; size?: number; color?: string } = {}): TextRun[] {
  return text.split("\n").map((line, index) => new TextRun({ text: line, break: index > 0 ? 1 : undefined, ...options }));
}

/** An uploaded image ready to embed: its bytes, type and display size in pixels. */
interface EmbeddedImage {
  data: Uint8Array;
  type: "png" | "jpg";
  width: number;
  height: number;
}

/** Usable width of the page (A4 with the margins below), in pixels at 96 dpi. */
const PAGE_WIDTH_PX = 600;

async function embedImage(dataUrl: string): Promise<EmbeddedImage> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, PAGE_WIDTH_PX / bitmap.width);
  const size = { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) };
  bitmap.close();
  return { data: new Uint8Array(await blob.arrayBuffer()), type: blob.type === "image/png" ? "png" : "jpg", ...size };
}

function toParagraphs(
  template: DocumentTemplate,
  block: TemplateBlock,
  values: TemplateValues,
  images: Map<string, EmbeddedImage>,
): Paragraph[] {
  const f = (text: string) => fill(template, text, values);

  switch (block.kind) {
    case "letterhead": {
      const alignment = block.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;
      return [
        new Paragraph({ alignment, children: lines(f("{{companyName}}"), { bold: true, size: 32, color: GOLD_DEEP }) }),
        new Paragraph({
          alignment,
          children: lines(`${f("{{companyAddress}}")}  ·  ${f("{{companyEmail}}")}`, { size: 18, color: "5B6270" }),
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "C9A24A", space: 6 } },
          spacing: { after: 360 },
        }),
      ];
    }
    case "partyLetterhead": {
      const upload = block.image ? images.get(block.image) : undefined;
      if (upload) {
        return [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [new ImageRun({ type: upload.type, data: upload.data, transformation: { width: upload.width, height: upload.height } })],
          }),
        ];
      }
      const details = block.details.filter((detail) => hasContent(template, detail, values));
      return [
        new Paragraph({ children: lines(f(block.name), { bold: true, size: 32 }) }),
        new Paragraph({
          children: lines(details.map(f).join("  ·  "), { size: 18, color: "5B6270" }),
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "14171C", space: 6 } },
          spacing: { after: 360 },
        }),
      ];
    }
    case "title":
      return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 }, children: lines(f(block.text).toUpperCase(), { bold: true, size: 28 }) })];
    case "date":
      return [new Paragraph({ spacing: { after: 240 }, children: lines(f(block.text)) })];
    case "address":
      return [
        ...block.lines.map((line) => new Paragraph({ children: lines(f(line)) })),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      ];
    case "heading":
      return [new Paragraph({ spacing: { before: 200, after: 120 }, children: lines(f(block.text), { bold: true }) })];
    case "paragraph":
      return [new Paragraph({ spacing: { after: 160 }, children: lines(f(block.text)) })];
    case "clauses":
      return block.items.map(
        (item, index) =>
          new Paragraph({
            spacing: { after: 140 },
            indent: { left: 360, hanging: 360 },
            children: [new TextRun({ text: `${index + 1}.\t${f(item.title)}. `, bold: true }), ...lines(f(item.text))],
          }),
      );
    case "bullets":
      return block.items.map((item) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: lines(f(item)) }));
    case "signatures":
      return block.parties.flatMap((party) => [
        new Paragraph({ spacing: { before: 480 }, children: lines(f(party.heading), { bold: true }) }),
        new Paragraph({ spacing: { before: 480 }, children: [new TextRun("______________________________")] }),
        ...party.lines.map((line) => new Paragraph({ spacing: { before: 60 }, children: lines(f(line)) })),
      ]);
    case "fillIn":
      return block.parties.flatMap((party) => [
        ...(party.heading ? [new Paragraph({ spacing: { before: 480 }, children: lines(f(party.heading), { bold: true }) })] : []),
        ...party.fields.map(
          (field) => new Paragraph({ spacing: { before: 200 }, children: [new TextRun(`${f(field)}: ______________________________`)] }),
        ),
      ]);
  }
}

/** The watermark as a page header image behind the text, so Word repeats it on every page. */
async function watermarkHeader(): Promise<Header> {
  const image = await embedImage(await watermarkDataUrl());
  const width = 520;
  const height = Math.round((image.height / image.width) * width);
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: image.data,
            transformation: { width, height },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
              behindDocument: true,
            },
          }),
        ],
      }),
    ],
  });
}

export async function buildDocx(template: DocumentTemplate, values: TemplateValues): Promise<Blob> {
  const images = new Map<string, EmbeddedImage>();
  for (const field of template.fields) {
    const value = values[field.key];
    if (field.kind === "image" && value) images.set(field.key, await embedImage(value));
  }
  const doc = new Document({
    creator: values.companyName || "Joint Venture Assets",
    title: template.name,
    styles: { default: { document: { run: { font: "Georgia", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1200, bottom: 1200, left: 1300, right: 1300 } } },
        ...(template.watermark ? { headers: { default: await watermarkHeader() } } : {}),
        children: template.blocks.flatMap((block) => toParagraphs(template, block, values, images)),
      },
    ],
  });
  return Packer.toBlob(doc);
}
