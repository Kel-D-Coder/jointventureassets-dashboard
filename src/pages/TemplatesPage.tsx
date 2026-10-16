import { Link } from "react-router-dom";
import { FaArrowRight, FaFileContract } from "react-icons/fa6";
import { documentTemplates } from "@/data/templates";
import { PageHeader } from "@/ui";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Templates"
        intro="Standard documents for clients. Open one, fill in the details, then download it as a Word file or save it as a PDF."
      />

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {documentTemplates.map((template) => (
          <li key={template.id}>
            <Link
              to={`/templates/${template.id}`}
              className="group flex h-full flex-col rounded-xl border border-fg/[0.08] bg-raised p-6 transition-shadow hover:shadow-[0_10px_30px_-12px_rgb(14_17_22/0.25)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold">
                <FaFileContract aria-hidden="true" />
              </span>
              <p className="label mt-5 text-gold-deep">{template.short}</p>
              <h2 className="mt-1 text-xl text-fg">{template.name}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{template.description}</p>
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-fg">
                Fill in {template.fields.length} details
                <FaArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        These are starting drafts. Have them reviewed by your lawyer before sending them to clients for the first time.
      </p>
    </div>
  );
}
