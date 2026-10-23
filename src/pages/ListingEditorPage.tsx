import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaArrowUpRightFromSquare, FaFloppyDisk, FaTrashCan } from "react-icons/fa6";
import { listings, type ListingInput } from "@/lib/api";
import { useAction } from "@/hooks/useResource";
import { ImageUploader } from "@/components/ImageUploader";
import { PersonLink } from "@/components/PersonLink";
import { DealClosingFields } from "@/components/DealClosingFields";
import { closingDraft, closingErrors, toClosing, type ClosingDraft, type ClosingErrors } from "@/lib/closing";
import { COMPANY_OWNER, missingFor, type CheckedField } from "@/lib/listingChecks";
import { listingStatusLabel, propertyTypeLabel, sharingFormulas, titleDocuments } from "@/data/labels";
import { websiteUrl } from "@/data/site";
import { Button, Card, CardTitle, Field, MoneyInput, Notice, NumberInput, PageHeader, SkeletonRows, Tabs, YesNo, inputClass, type YesNoValue } from "@/ui";
import type { DealType, Listing, ListingStatus, ListingSubmission, PartnerRequest, PropertyType } from "@/types";

/** Form values — numbers stay as strings while they're being typed. */
interface Draft {
  title: string;
  dealType: DealType;
  propertyType: PropertyType;
  area: string;
  city: string;
  state: string;
  sizeSqm: string;
  price: string;
  titleDocument: string;
  description: string;
  highlights: string;
  images: string[];
  sharingFormula: string;
  sharingNegotiable: YesNoValue;
  hasPremium: YesNoValue;
  /** Digits only. */
  premium: string;
  /** Optional: "no" saves no proposal. */
  hasProposal: YesNoValue;
  proposal: string;
  duration: string;
  /** "company" lists it under Joint Venture Assets; "other" uses `ownerName`. */
  ownerMode: "company" | "other";
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: ListingStatus;
  /** Filled in when the status is "closed". */
  closing: ClosingDraft;
  featured: boolean;
  verified: boolean;
  /** The website listing submission this came from, if any. */
  sourceSubmissionId?: string;
}

const emptyDraft: Draft = {
  title: "",
  dealType: "jv",
  propertyType: "land",
  area: "",
  city: "",
  state: "Lagos",
  sizeSqm: "",
  price: "",
  titleDocument: "C of O",
  description: "",
  highlights: "",
  images: [],
  sharingFormula: "40/60",
  sharingNegotiable: "",
  hasPremium: "",
  premium: "",
  hasProposal: "no",
  proposal: "",
  duration: "",
  ownerMode: "company",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  status: "draft",
  closing: closingDraft(),
  featured: false,
  verified: false,
};

const publishedStatuses: ListingStatus[] = ["published", "under_offer", "closed"];

/** The premium and negotiable answers as form values; "" when not answered yet. */
function jvAnswers(jv?: { sharingNegotiable?: boolean; premium?: number }): Pick<Draft, "sharingNegotiable" | "hasPremium" | "premium"> {
  return {
    sharingNegotiable: jv?.sharingNegotiable === undefined ? "" : jv.sharingNegotiable ? "yes" : "no",
    hasPremium: jv?.premium === undefined ? "" : jv.premium > 0 ? "yes" : "no",
    premium: jv?.premium ? String(jv.premium) : "",
  };
}

function draftFromListing(listing: Listing): Draft {
  const isCompany = listing.ownerName === COMPANY_OWNER;
  return {
    title: listing.title,
    dealType: listing.dealType,
    propertyType: listing.propertyType,
    area: listing.area,
    city: listing.city,
    state: listing.state,
    sizeSqm: listing.sizeSqm ? String(listing.sizeSqm) : "",
    price: listing.price ? String(listing.price) : "",
    titleDocument: listing.titleDocument,
    description: listing.description,
    highlights: listing.highlights.join("\n"),
    images: listing.images,
    sharingFormula: listing.jv?.sharingFormula ?? emptyDraft.sharingFormula,
    ...jvAnswers(listing.jv),
    hasProposal: listing.jv?.proposal ? "yes" : "no",
    proposal: listing.jv?.proposal ?? "",
    duration: listing.jv?.duration ?? "",
    ownerMode: isCompany ? "company" : "other",
    ownerName: isCompany ? "" : listing.ownerName,
    ownerEmail: listing.ownerEmail ?? "",
    ownerPhone: listing.ownerPhone ?? "",
    status: listing.status,
    closing: closingDraft(listing.closing, listing.price),
    featured: listing.featured,
    verified: listing.verified,
    sourceSubmissionId: listing.sourceSubmissionId,
  };
}

function draftFromSubmission(submission: ListingSubmission): Draft {
  const { listing } = submission;
  return {
    ...emptyDraft,
    title: listing.title,
    dealType: listing.dealType,
    propertyType: listing.propertyType,
    area: listing.area,
    city: listing.city,
    state: listing.state,
    sizeSqm: listing.sizeSqm ? String(listing.sizeSqm) : "",
    price: listing.price ? String(listing.price) : "",
    titleDocument: listing.titleDocument,
    description: listing.description,
    highlights: listing.highlights.join("\n"),
    images: listing.images,
    sharingFormula: listing.jv?.sharingFormula ?? emptyDraft.sharingFormula,
    ...jvAnswers(listing.jv),
    hasProposal: listing.jv?.proposal ? "yes" : "no",
    proposal: listing.jv?.proposal ?? "",
    duration: listing.jv?.duration ?? "",
    ownerMode: listing.ownerName === COMPANY_OWNER ? "company" : "other",
    ownerName: listing.ownerName === COMPANY_OWNER ? "" : listing.ownerName,
    // The person who submitted is the contact, whether they're the owner or acting for them.
    ownerEmail: submission.contact.email,
    ownerPhone: submission.contact.phoneNumber,
    sourceSubmissionId: submission.id,
  };
}

function draftFromRequest(request: PartnerRequest): Draft {
  const [area = "", city = ""] = request.location.split(",").map((part) => part.trim());
  return {
    ...emptyDraft,
    title: request.title,
    area,
    city: city || area,
    sizeSqm: (request.landSize ?? "").replace(/[^\d]/g, ""),
    price: String(request.budget),
    titleDocument: request.titleDocument ?? emptyDraft.titleDocument,
    description: request.description,
    images: request.documents,
    sharingFormula: request.sharingFormula ?? emptyDraft.sharingFormula,
    ...jvAnswers(request),
    duration: request.timeline,
    ownerMode: "other",
    ownerName: request.fullName,
    ownerEmail: request.email,
    ownerPhone: request.phoneNumber,
    verified: true,
  };
}

function toInput(draft: Draft, status: ListingStatus): ListingInput {
  return {
    title: draft.title.trim(),
    dealType: draft.dealType,
    propertyType: draft.propertyType,
    area: draft.area.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    sizeSqm: Number(draft.sizeSqm) || 0,
    price: Number(draft.price) || 0,
    titleDocument: draft.titleDocument,
    description: draft.description.trim(),
    highlights: draft.highlights.split("\n").map((line) => line.trim()).filter(Boolean),
    images: draft.images,
    jv:
      draft.dealType === "jv"
        ? {
            sharingFormula: draft.sharingFormula,
            sharingNegotiable: draft.sharingNegotiable ? draft.sharingNegotiable === "yes" : undefined,
            // "Yes" without an amount stays unanswered, so publishing asks for the amount.
            premium: draft.hasPremium === "no" ? 0 : draft.hasPremium === "yes" && Number(draft.premium) > 0 ? Number(draft.premium) : undefined,
            proposal: draft.hasProposal === "yes" ? draft.proposal.trim() : "",
            duration: draft.duration.trim(),
          }
        : undefined,
    ownerName: draft.ownerMode === "company" ? COMPANY_OWNER : draft.ownerName.trim(),
    ownerEmail: draft.ownerMode === "company" ? undefined : draft.ownerEmail.trim() || undefined,
    ownerPhone: draft.ownerMode === "company" ? undefined : draft.ownerPhone.trim() || undefined,
    status,
    closing: status === "closed" ? toClosing(draft.closing) : undefined,
    featured: draft.featured,
    verified: draft.verified,
    sourceSubmissionId: draft.sourceSubmissionId,
  };
}

export default function ListingEditorPage() {
  const { listingId } = useParams();
  const isNew = !listingId;
  const navigate = useNavigate();
  const state = useLocation().state as { fromRequest?: PartnerRequest; fromSubmission?: ListingSubmission } | null;
  const fromRequest = state?.fromRequest;
  const fromSubmission = state?.fromSubmission;
  // "Record a closed deal" opens a listing with ?close=1.
  const [searchParams] = useSearchParams();
  const closeRequested = searchParams.get("close") === "1";

  const [draft, setDraft] = useState<Draft>(() =>
    fromSubmission ? draftFromSubmission(fromSubmission) : fromRequest ? draftFromRequest(fromRequest) : emptyDraft,
  );
  const [loading, setLoading] = useState(!isNew);
  const [errors, setErrors] = useState<Partial<Record<CheckedField, string>>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [closingProblems, setClosingProblems] = useState<ClosingErrors>({});

  // Leaving a new listing or a draft with unsaved changes saves it to Drafts (see the effect below).
  /** The form as it was last loaded or saved; anything different is unsaved. */
  const savedRef = useRef<Draft>(draft);
  const latestRef = useRef<Draft>(draft);
  /** Set while a save or delete is running, or after a delete, so leaving doesn't save a second copy. */
  const busyRef = useRef(false);
  const hasUnsavedDraft = () =>
    !busyRef.current && latestRef.current.status === "draft" && JSON.stringify(latestRef.current) !== JSON.stringify(savedRef.current);

  useEffect(() => {
    latestRef.current = draft;
  }, [draft]);

  const save = useAction(
    (input: ListingInput) => (listingId ? listings.update(listingId, input) : listings.create(input)),
    "Couldn't save the listing.",
  );
  const remove = useAction(listings.remove, "Couldn't delete the listing.");

  useEffect(() => {
    if (!listingId) return;
    listings
      .get(listingId)
      .then((listing) => {
        const loaded = draftFromListing(listing);
        savedRef.current = loaded;
        latestRef.current = loaded;
        setDraft(closeRequested && listing.status !== "draft" ? { ...loaded, status: "closed" } : loaded);
        if (closeRequested && listing.status !== "closed") {
          setNotice({ tone: "success", text: "Marked as closed. Fill in the closing details below, then save." });
        }
      })
      .catch((caught: Error) => setNotice({ tone: "error", text: caught.message }))
      .finally(() => setLoading(false));
  }, [listingId, closeRequested]);

  useEffect(() => {
    // Closing or reloading the tab can't wait for a save, so the browser asks first.
    const warn = (event: BeforeUnloadEvent) => {
      if (hasUnsavedDraft()) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // Moving to another page in the dashboard: save to Drafts in the background.
      if (!hasUnsavedDraft()) return;
      const input = toInput(latestRef.current, "draft");
      (listingId ? listings.update(listingId, input) : listings.create(input)).catch((caught: Error) =>
        console.error("Couldn't save the draft when leaving the page:", caught.message),
      );
    };
    // Runs once per listing; the refs carry the latest form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const isDraft = draft.status === "draft";
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const persist = async (status: ListingStatus, successText: string) => {
    busyRef.current = true;
    try {
      const saved = await save.run(toInput(draft, status));
      // Both refs now match, so the page change that follows a save doesn't save it again.
      savedRef.current = { ...draft, status };
      latestRef.current = savedRef.current;
      setDraft((current) => ({ ...current, status }));
      setNotice({ tone: "success", text: successText });
      if (isNew || closeRequested) navigate(`/listings/${saved.id}`, { replace: true });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    } finally {
      busyRef.current = false;
    }
  };

  /** Saves whatever has been filled in so far — nothing is required. */
  const saveDraft = () => {
    setErrors({});
    void persist("draft", "Saved to Drafts. Finish it any time from the Drafts page.");
  };

  /** Publishing (or saving a live listing) needs every required field. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const status = isDraft ? "published" : draft.status;
    const missing = missingFor(toInput(draft, status));
    const closingProblemsNow = status === "closed" ? closingErrors(draft.closing) : {};
    setClosingProblems(closingProblemsNow);
    // The proposal is optional, but "Yes" needs the proposal written in.
    if (draft.dealType === "jv" && draft.hasProposal === "yes" && !draft.proposal.trim()) {
      missing.push({ field: "proposal", label: "Proposal", message: "Describe the proposal, or choose No.", passes: () => false });
    }
    setErrors(Object.fromEntries(missing.map((check) => [check.field, check.message])));
    if (Object.keys(closingProblemsNow).length) {
      setNotice({ tone: "error", text: "Fill in the closing details: when it closed, who with, and the agreed amount." });
      return;
    }
    if (missing.length) {
      setNotice({
        tone: "error",
        text: `Can't publish yet. Missing: ${missing.map((check) => check.label).join(", ")}. You can save it as a draft instead.`,
      });
      return;
    }
    void persist(
      status,
      isDraft ? "Published. It's now live on the website." : status === "closed" ? "Saved. The deal is on the Closed deals page." : "Changes saved.",
    );
  };

  const handleDelete = async () => {
    if (!listingId) return;
    busyRef.current = true;
    try {
      await remove.run(listingId);
      // Stays set: the listing is gone, so leaving must not save it again.
      navigate(isDraft ? "/drafts" : "/listings", { replace: true });
    } catch (caught) {
      busyRef.current = false;
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  const back = (
    <Link to={isDraft && !isNew ? "/drafts" : "/listings"} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
      <FaArrowLeft aria-hidden="true" /> {isDraft && !isNew ? "All drafts" : "All listings"}
    </Link>
  );

  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={8} /></div>;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {back}
      <PageHeader
        eyebrow={isNew ? "New listing" : isDraft ? "Draft" : listingId}
        title={isNew ? "Create a listing" : draft.title || "Untitled draft"}
        intro={
          fromSubmission
            ? `Pre-filled from ${fromSubmission.contact.fullName}'s listing request. Check everything before publishing.`
            : fromRequest
            ? `Pre-filled from ${fromRequest.fullName}'s request. Check everything before publishing.`
            : isNew
              ? "Not got everything yet? Save it as a draft, or just leave: your changes are saved to Drafts."
              : undefined
        }
        action={
          !isNew && !isDraft ? (
            <a href={websiteUrl(`/listings/${listingId}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-fg/15 bg-raised px-4 py-2.5 text-sm font-semibold hover:border-fg/40">
              <FaArrowUpRightFromSquare aria-hidden="true" /> View on website
            </a>
          ) : undefined
        }
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {draft.status === "closed" ? (
            <Card className="border-success/30">
              <CardTitle
                hint="Shown on the Closed deals page."
                action={
                  <Link to="/closed-deals" className="text-sm font-semibold text-gold-deep hover:underline">
                    Closed deals
                  </Link>
                }
              >
                Closing details
              </CardTitle>
              <DealClosingFields value={draft.closing} onChange={(closing) => set("closing", closing)} errors={closingProblems} dealType={draft.dealType} />
            </Card>
          ) : null}

          <Card>
            <CardTitle hint="Joint venture: the owner wants a development partner. For sale: an outright purchase.">Deal</CardTitle>
            <Tabs
              label="Deal type"
              value={draft.dealType}
              onChange={(value) => set("dealType", value)}
              options={[
                { value: "jv", label: "Joint venture" },
                { value: "sale", label: "For sale" },
              ]}
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Title" error={errors.title} className="sm:col-span-2">
                <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Property type">
                <select value={draft.propertyType} onChange={(e) => set("propertyType", e.target.value as PropertyType)} className={inputClass}>
                  {Object.entries(propertyTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Title document">
                <select value={draft.titleDocument} onChange={(e) => set("titleDocument", e.target.value)} className={inputClass}>
                  {titleDocuments.map((doc) => (
                    <option key={doc}>{doc}</option>
                  ))}
                </select>
              </Field>
              <Field label="Size (sqm)" error={errors.sizeSqm} hint="1 hectare = 10,000 sqm">
                <NumberInput value={draft.sizeSqm} onChange={(digits) => set("sizeSqm", digits)} />
              </Field>
              <Field label={draft.dealType === "jv" ? "Land value (₦)" : "Asking price (₦)"} error={errors.price}>
                <MoneyInput value={draft.price} onChange={(digits) => set("price", digits)} />
              </Field>
            </div>
          </Card>

          {draft.dealType === "jv" ? (
            <Card>
              <CardTitle hint="What a developer would be signing up for.">Joint-venture terms</CardTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sharing formula" hint="Landowner / developer">
                  <select value={draft.sharingFormula} onChange={(e) => set("sharingFormula", e.target.value)} className={inputClass}>
                    {sharingFormulas.map((formula) => (
                      <option key={formula}>{formula}</option>
                    ))}
                  </select>
                </Field>
                <YesNo
                  name="sharingNegotiable"
                  legend="Is the sharing formula negotiable?"
                  value={draft.sharingNegotiable}
                  onChange={(value) => set("sharingNegotiable", value)}
                  yes="Negotiable"
                  no="Fixed"
                  error={errors.sharingNegotiable}
                />
                <YesNo
                  name="hasPremium"
                  legend="Is there a premium?"
                  value={draft.hasPremium}
                  onChange={(value) => set("hasPremium", value)}
                  yes="Yes"
                  no="No premium"
                  error={draft.hasPremium === "yes" ? undefined : errors.premium}
                />
                {draft.hasPremium === "yes" ? (
                  <Field label="Premium amount (₦)" hint="Paid upfront by the developer to the landowner." error={errors.premium}>
                    <MoneyInput value={draft.premium} onChange={(digits) => set("premium", digits)} />
                  </Field>
                ) : null}
                <Field label="Build period">
                  <input value={draft.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 24 months" className={inputClass} />
                </Field>
                <YesNo
                  name="hasProposal"
                  legend="Is there a proposal? (optional)"
                  value={draft.hasProposal}
                  onChange={(value) => set("hasProposal", value)}
                  yes="Yes"
                  no="No"
                />
                {draft.hasProposal === "yes" ? (
                  <Field label="Proposal" error={errors.proposal}>
                    <input value={draft.proposal} onChange={(e) => set("proposal", e.target.value)} placeholder="e.g. 12 units of 3-bed apartments" className={inputClass} />
                  </Field>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardTitle>Location & description</CardTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Area" error={errors.area}>
                <input value={draft.area} onChange={(e) => set("area", e.target.value)} className={inputClass} />
              </Field>
              <Field label="City" error={errors.city}>
                <input value={draft.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
              </Field>
              <Field label="State">
                <input value={draft.state} onChange={(e) => set("state", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Description" error={errors.description} className="sm:col-span-3">
                <textarea rows={5} value={draft.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Highlights" hint="One per line, shown as a checklist on the website." className="sm:col-span-3">
                <textarea rows={3} value={draft.highlights} onChange={(e) => set("highlights", e.target.value)} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle hint="The first photo is the cover on listing cards. Drag in several at once.">Photos</CardTitle>
            <ImageUploader images={draft.images} onChange={(images) => set("images", images)} error={errors.images} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardTitle>{isDraft ? "Save" : "Publishing"}</CardTitle>
            <div className="space-y-4">
              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold text-fg">Owner</legend>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 rounded-lg border border-fg/15 px-3 py-2.5 text-sm has-checked:border-gold has-checked:bg-gold-soft/40">
                    <input type="radio" name="owner" checked={draft.ownerMode === "company"} onChange={() => set("ownerMode", "company")} className="accent-[#c9a24a]" />
                    {COMPANY_OWNER}
                  </label>
                  <label className="flex items-center gap-2.5 rounded-lg border border-fg/15 px-3 py-2.5 text-sm has-checked:border-gold has-checked:bg-gold-soft/40">
                    <input type="radio" name="owner" checked={draft.ownerMode === "other"} onChange={() => set("ownerMode", "other")} className="accent-[#c9a24a]" />
                    A different owner
                  </label>
                </div>
                {draft.ownerMode === "other" ? (
                  <Field label="Owner's name" error={errors.ownerName} className="mt-3">
                    <input value={draft.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="Person or company" className={inputClass} />
                  </Field>
                ) : null}
                {draft.ownerMode === "other" ? (
                  <>
                    <Field label="Owner's email" className="mt-3">
                      <input type="email" value={draft.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Owner's phone" hint="Only the JVA team sees these." className="mt-3">
                      <input type="tel" value={draft.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} className={inputClass} />
                    </Field>
                    {draft.ownerName.trim() && draft.ownerEmail.trim() ? (
                      <p className="mt-2 text-xs text-muted">
                        <PersonLink name={draft.ownerName.trim()} email={draft.ownerEmail.trim()} showRole className="font-semibold text-fg" />
                      </p>
                    ) : null}
                  </>
                ) : null}
              </fieldset>

              {!isDraft ? (
                <Field label="Status">
                  <select value={draft.status} onChange={(e) => set("status", e.target.value as ListingStatus)} className={inputClass}>
                    {publishedStatuses.map((status) => (
                      <option key={status} value={status}>{listingStatusLabel[status]}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={draft.verified} onChange={(e) => set("verified", e.target.checked)} className="h-4 w-4 accent-[#c9a24a]" />
                Documents verified
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[#c9a24a]" />
                Feature on the homepage
              </label>
            </div>

            <div className="mt-6 grid gap-2">
              <Button type="submit" tone="solid" size="md" disabled={save.pending}>
                {save.pending ? "Saving…" : isDraft ? "Publish listing" : "Save changes"}
              </Button>
              {isDraft ? (
                <Button size="md" onClick={saveDraft} disabled={save.pending}>
                  <FaFloppyDisk aria-hidden="true" /> Save as draft
                </Button>
              ) : null}
              {!isNew ? (
                confirmDelete ? (
                  <div className="flex gap-2 pt-2">
                    <Button tone="danger" disabled={remove.pending} onClick={handleDelete}>
                      {remove.pending ? "Deleting…" : "Confirm delete"}
                    </Button>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Button tone="danger" onClick={() => setConfirmDelete(true)}>
                      <FaTrashCan aria-hidden="true" /> Delete {isDraft ? "draft" : "listing"}
                    </Button>
                  </div>
                )
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
