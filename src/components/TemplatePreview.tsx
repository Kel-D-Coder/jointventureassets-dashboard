import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { watermarkDataUrl } from "@/lib/watermark";
import type { DocumentTemplate, TemplateBlock } from "@/data/templates";
import { hasContent, segments, type TemplateValues } from "@/lib/templates";
import { cx } from "@/lib/format";

/**
 * An A4-style page showing the filled-in document. On screen, filled
 * placeholders are tinted gold and empty ones red; in print both are plain.
 */
/** Height of an A4 page at this preview's width (210mm wide), in CSS pixels. */
const A4_PAGE_PX = 1123;

export function TemplatePreview({ template, values }: { template: DocumentTemplate; values: TemplateValues }) {
  const article = useRef<HTMLElement>(null);
  const [watermark, setWatermark] = useState<string | null>(null);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    if (template.watermark) void watermarkDataUrl().then(setWatermark);
  }, [template.watermark]);

  // One on-screen watermark per page-length of document.
  useEffect(() => {
    const element = article.current;
    if (!element || !template.watermark) return;
    const observer = new ResizeObserver(() => setPages(Math.max(1, Math.ceil(element.offsetHeight / A4_PAGE_PX))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [template.watermark]);

  const text = (source: string): ReactNode =>
    segments(template, source, values).map((part, index) =>
      part.filled === undefined ? (
        <Fragment key={index}>{part.text}</Fragment>
      ) : (
        <mark
          key={index}
          className={cx(
            "rounded-sm px-0.5 whitespace-pre-line print:bg-transparent print:p-0",
            part.filled ? "bg-gold-soft text-fg" : "bg-danger/10 text-danger",
          )}
        >
          {part.text}
        </mark>
      ),
    );

  const render = (block: TemplateBlock, index: number): ReactNode => {
    switch (block.kind) {
      case "letterhead":
        return block.align === "center" ? (
          <header key={index} className="mb-8 flex flex-col items-center gap-2 border-b-2 border-gold pb-4 text-center">
            <img src="/logo.png" alt="" className="h-16 w-16 object-contain" />
            <p className="font-display text-2xl text-gold-deep">{text("{{companyName}}")}</p>
            <p className="text-xs text-muted">
              {text("{{companyAddress}}")} · {text("{{companyEmail}}")}
            </p>
          </header>
        ) : (
          <header key={index} className="mb-8 flex items-center gap-4 border-b-2 border-gold pb-4">
            <img src="/logo.png" alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="font-display text-2xl text-gold-deep">{text("{{companyName}}")}</p>
              <p className="text-xs text-muted">
                {text("{{companyAddress}}")} · {text("{{companyEmail}}")}
              </p>
            </div>
          </header>
        );
      case "partyLetterhead": {
        const upload = block.image ? values[block.image] : undefined;
        if (upload) {
          return (
            <header key={index} className="mb-8">
              <img src={upload} alt="Letterhead" className="mx-auto max-h-48 w-full object-contain" />
            </header>
          );
        }
        const details = block.details.filter((detail) => hasContent(template, detail, values));
        return (
          <header key={index} className="mb-8 border-b-2 border-fg/70 pb-4">
            <p className="font-display text-2xl text-fg">{text(block.name)}</p>
            <p className="mt-1 text-xs text-muted">
              {details.map((detail, i) => (
                <Fragment key={i}>
                  {i > 0 ? " · " : null}
                  {text(detail)}
                </Fragment>
              ))}
            </p>
          </header>
        );
      }
      case "title":
        return <h2 key={index} className="my-6 text-center font-sans text-base font-bold tracking-wide uppercase">{text(block.text)}</h2>;
      case "date":
        return <p key={index} className="mb-6">{text(block.text)}</p>;
      case "address":
        return (
          <address key={index} className="mb-6 not-italic">
            {block.lines.map((line, i) => <p key={i}>{text(line)}</p>)}
          </address>
        );
      case "heading":
        return <h3 key={index} className="mt-5 mb-2 font-sans text-sm font-bold">{text(block.text)}</h3>;
      case "paragraph":
        return <p key={index} className="mb-3 whitespace-pre-line">{text(block.text)}</p>;
      case "clauses":
        return (
          <ol key={index} className="mb-3 space-y-2.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-bold">{i + 1}.</span>
                <span>
                  <strong>{text(item.title)}.</strong> {text(item.text)}
                </span>
              </li>
            ))}
          </ol>
        );
      case "bullets":
        return (
          <ul key={index} className="mb-3 list-disc space-y-1.5 pl-6">
            {block.items.map((item, i) => <li key={i}>{text(item)}</li>)}
          </ul>
        );
      case "signatures":
        return (
          <div key={index} className="mt-10 grid gap-10 sm:grid-cols-2 print:grid-cols-2">
            {block.parties.map((party, i) => (
              <div key={i}>
                <p className="font-bold">{text(party.heading)}</p>
                <div className="mt-12 mb-2 border-b border-fg/60" />
                {party.lines.map((line, j) => <p key={j} className="text-sm">{text(line)}</p>)}
              </div>
            ))}
          </div>
        );
      case "fillIn":
        return (
          <div key={index} className="mt-6 mb-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 print:grid-cols-2">
            {block.parties.map((party, i) => (
              <div key={i} className="break-inside-avoid">
                {party.heading ? <p className="font-bold">{text(party.heading)}</p> : null}
                {party.fields.map((field, j) => (
                  <p key={j} className="mt-4 flex items-end gap-2 text-sm">
                    <span className="shrink-0">{text(field)}:</span>
                    <span className="flex-1 border-b border-fg/60" aria-hidden="true" />
                  </p>
                ))}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <article
      ref={article}
      aria-label={`${template.name} preview`}
      className="relative mx-auto w-full max-w-[210mm] rounded-sm bg-white px-8 py-10 font-display text-[0.9375rem] leading-relaxed text-fg shadow-[0_10px_40px_-10px_rgb(14_17_22/0.25)] sm:px-14 sm:py-14 print:max-w-none print:p-0 print:shadow-none"
    >
      {watermark ? (
        <>
          {/* On screen: one per page-length. */}
          {Array.from({ length: pages }, (_, page) => (
            <img
              key={page}
              src={watermark}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 w-3/4 -translate-x-1/2 -translate-y-1/2 select-none print:hidden"
              style={{ top: page * A4_PAGE_PX + A4_PAGE_PX / 2 }}
            />
          ))}
          {/* In print / PDF: fixed elements repeat on every printed page. */}
          <img
            src={watermark}
            alt=""
            aria-hidden="true"
            className="pointer-events-none fixed top-1/2 left-1/2 hidden w-3/4 -translate-x-1/2 -translate-y-1/2 select-none print:block"
          />
        </>
      ) : null}
      <div className="relative">{template.blocks.map(render)}</div>
    </article>
  );
}
