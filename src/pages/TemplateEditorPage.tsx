import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { FaArrowLeft, FaArrowRotateLeft, FaFileWord, FaPaperPlane, FaPrint } from "react-icons/fa6";
import { documentTemplates, type DocumentTemplate } from "@/data/templates";
import { listings } from "@/lib/mockApi";
import { useResource } from "@/hooks/useResource";
import { TemplatePreview } from "@/components/TemplatePreview";
import { SendForSignatureDialog, type SentRecord } from "@/components/SendForSignatureDialog";
import { readLetterhead } from "@/lib/image";
import { formatDateTime } from "@/lib/format";
import { downloadBlob, emptyFields, fileName, initialValues, type TemplateValues } from "@/lib/templates";
import { readStored, writeStored } from "@/lib/storage";
import { Button, Card, Field, Notice, PageHeader, Pill, inputClass } from "@/ui";

const storageKey = (id: string) => `jva-template-values:${id}`;
const sentKey = (id: string) => `jva-template-sent:${id}`;

/** Opening a template from elsewhere (e.g. a listing request) can pre-fill some fields. */
interface PrefillState {
  prefill?: Record<string, string>;
  source?: string;
}

export default function TemplateEditorPage() {
  const { templateId = "" } = useParams();
  const template = documentTemplates.find((candidate) => candidate.id === templateId);
  if (!template) return <Navigate to="/templates" replace />;
  // Keyed so switching templates starts fresh state.
  return <TemplateEditor key={template.id} template={template} />;
}

function TemplateEditor({ template }: { template: DocumentTemplate }) {
  const incoming = (useLocation().state as PrefillState | null) ?? {};
  // Last-used values are remembered per template in this browser; a pre-fill wins over them.
  const [values, setValues] = useState<TemplateValues>(() => ({
    ...initialValues(template),
    ...readStored<TemplateValues>(storageKey(template.id), {}),
    ...(incoming.prefill ?? {}),
  }));
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(() =>
    incoming.prefill ? { tone: "success", text: `Filled in from ${incoming.source ?? "the listing request"}. Check the remaining fields before sending.` } : null,
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<SentRecord[]>(() => readStored<SentRecord[]>(sentKey(template.id), []));
  const [downloading, setDownloading] = useState(false);
  const { data: allListings = [] } = useResource(listings.list, "Couldn't load the listings.");

  useEffect(() => {
    try {
      writeStored(storageKey(template.id), values);
    } catch {
      // Not being able to remember the values isn't worth interrupting for.
    }
  }, [template.id, values]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, DocumentTemplate["fields"]>();
    for (const field of template.fields) byGroup.set(field.group, [...(byGroup.get(field.group) ?? []), field]);
    return [...byGroup.entries()];
  }, [template]);

  const missing = emptyFields(template, values);
  const canFillFromListing = template.fields.some((field) => field.fromListing);
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const fillFromListing = (id: string) => {
    const listing = allListings.find((candidate) => candidate.id === id);
    if (!listing) return;
    setValues((current) => {
      const next = { ...current };
      for (const field of template.fields) if (field.fromListing) next[field.key] = field.fromListing(listing);
      return next;
    });
    setNotice({ tone: "success", text: `Property details filled in from "${listing.title}".` });
  };

  const reset = () => {
    if (!window.confirm("Clear everything you've typed and go back to the template's defaults?")) return;
    setValues(initialValues(template));
    setNotice(null);
  };

  const downloadWord = async () => {
    setDownloading(true);
    try {
      const { buildDocx } = await import("@/lib/templateDocx");
      downloadBlob(await buildDocx(template, values), fileName(template, values, "docx"));
      setNotice({ tone: "success", text: "Word document downloaded. Open it to make any final edits before sending." });
    } catch {
      setNotice({ tone: "error", text: "Couldn't create the Word document. Try again." });
    } finally {
      setDownloading(false);
    }
  };

  const recordSent = (record: SentRecord) => {
    const next = [record, ...sent];
    setSent(next);
    try {
      writeStored(sentKey(template.id), next);
    } catch {
      // The log is a convenience; losing it isn't worth interrupting for.
    }
    setSending(false);
    setNotice({ tone: "success", text: `Sent to ${record.memberName} (${record.email}) for signature.` });
  };

  /** The name in the document most likely to be the signer, to preselect them. */
  const suggestedSigner = values.clientName || values.landownerName || values.recipientName || "";

  const printPdf = () => {
    // The browser uses the page title as the suggested PDF file name.
    const previous = document.title;
    document.title = fileName(template, values, "pdf").replace(/\.pdf$/, "");
    window.print();
    document.title = previous;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <Link to="/templates" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <FaArrowLeft aria-hidden="true" /> All templates
        </Link>
        <PageHeader
          eyebrow={template.short}
          title={template.name}
          intro={template.description}
          action={
            <>
              <Button size="md" onClick={reset}>
                <FaArrowRotateLeft aria-hidden="true" /> Reset
              </Button>
              <Button size="md" onClick={printPdf}>
                <FaPrint aria-hidden="true" /> Print / save as PDF
              </Button>
              <Button size="md" tone="gold" onClick={downloadWord} disabled={downloading}>
                <FaFileWord aria-hidden="true" /> {downloading ? "Preparing…" : "Download Word"}
              </Button>
              <Button size="md" tone="solid" onClick={() => setSending(true)}>
                <FaPaperPlane aria-hidden="true" /> Send for signature
              </Button>
            </>
          }
        />
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        {missing.length ? (
          <p className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning">
            Still blank: <strong>{missing.map((field) => field.label).join(", ")}</strong>. Blanks appear as [Label] in the download.
          </p>
        ) : null}
        {sent.length ? (
          <Card>
            <p className="label mb-3 text-muted">Sent for signature</p>
            <ul className="divide-y divide-fg/8">
              {sent.slice(0, 5).map((record) => (
                <li key={record.sentAt} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold text-fg">{record.memberName}</span>
                    <span className="text-muted"> · {record.email} · {formatDateTime(record.sentAt)}</span>
                  </span>
                  <Pill tone="warning">Awaiting signature</Pill>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Demo mode: emails go out once the backend is connected.</p>
          </Card>
        ) : null}
      </div>

      {sending ? (
        <SendForSignatureDialog
          templateId={template.id}
          documentName={fileName(template, values, "pdf").replace(/\.pdf$/, "")}
          values={values}
          suggestedName={suggestedSigner}
          missing={missing.map((field) => field.label)}
          onClose={() => setSending(false)}
          onSent={recordSent}
        />
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-5 print:hidden xl:sticky xl:top-6 xl:max-h-[calc(100svh-3rem)] xl:overflow-y-auto xl:pr-1">
          {canFillFromListing ? (
            <Card>
              <Field label="Fill from a listing" hint="Copies the property details into the fields below.">
                <select defaultValue="" onChange={(event) => fillFromListing(event.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Choose a property…
                  </option>
                  {allListings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title}, {listing.city}
                    </option>
                  ))}
                </select>
              </Field>
            </Card>
          ) : null}

          {groups.map(([group, fields]) => (
            <Card key={group}>
              <p className="label mb-4 text-muted">{group}</p>
              <div className="space-y-4">
                {fields.map((field) => (
                  <Field key={field.key} label={field.label} hint={field.hint}>
                    {field.kind === "image" ? (
                      <ImageField value={values[field.key] ?? ""} onChange={(value) => set(field.key, value)} />
                    ) : field.kind === "textarea" ? (
                      <textarea rows={3} value={values[field.key] ?? ""} onChange={(event) => set(field.key, event.target.value)} className={inputClass} />
                    ) : (
                      <input
                        type={field.kind === "date" ? "date" : "text"}
                        value={values[field.key] ?? ""}
                        onChange={(event) => set(field.key, event.target.value)}
                        className={inputClass}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl bg-fg/4 p-4 sm:p-8 print:overflow-visible print:bg-transparent print:p-0">
          <TemplatePreview template={template} values={values} />
        </div>
      </div>
    </div>
  );
}

/** Upload, preview, replace or remove an image (e.g. a client's letterhead). */
function ImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");
  const [reading, setReading] = useState(false);

  const choose = async (file?: File) => {
    if (!file) return;
    setProblem("");
    setReading(true);
    try {
      onChange(await readLetterhead(file));
    } catch (caught) {
      setProblem((caught as Error).message);
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value ? <img src={value} alt="Uploaded letterhead" className="max-h-28 w-full rounded-lg border border-fg/10 bg-white object-contain p-2" /> : null}
      <div className="flex gap-2">
        <Button onClick={() => input.current?.click()} disabled={reading}>
          {reading ? "Reading…" : value ? "Replace image" : "Upload image"}
        </Button>
        {value ? (
          <Button tone="danger" onClick={() => onChange("")}>
            Remove
          </Button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={(event) => choose(event.target.files?.[0])} />
      {problem ? <p className="text-xs font-medium text-danger">{problem}</p> : null}
    </div>
  );
}
