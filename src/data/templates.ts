import { formatSize } from "@/lib/format";
import type { Listing } from "@/types";
import { isLandValueTbd } from "@/data/labels";

/**
 * Document templates. Text uses {{key}} placeholders, each filled from a
 * field the admin edits on the template page. To add a template, add an entry
 * here — the list page, editor, preview and Word download all follow.
 *
 * These are starting drafts: have them reviewed by a lawyer before first use.
 */

export interface TemplateField {
  key: string;
  label: string;
  group: string;
  /**
   * "image" is an uploaded picture (e.g. a letterhead), stored as a data URL. "number" is an amount
   * or size typed as digits and kept with comma separators ("1,000,000"), as the document shows it.
   */
  kind?: "text" | "date" | "textarea" | "image" | "number";
  hint?: string;
  /** Starting value. "today" becomes today's date. */
  defaultValue?: string;
  /** Optional fields print as a blank line when empty, and aren't listed as missing. */
  optional?: boolean;
  /** How to fill this field when a listing is picked with "Fill from a listing". */
  fromListing?: (listing: Listing) => string;
}

export type TemplateBlock =
  | { kind: "letterhead"; align?: "left" | "center" }
  /** Another party's letterhead (e.g. the developer's on an LOI): their name and details, no JVA logo. */
  /** `image` names an image field; when it has an upload, that picture is used instead of the typed details. */
  | { kind: "partyLetterhead"; name: string; details: string[]; image?: string }
  | { kind: "title"; text: string }
  | { kind: "date"; text: string }
  | { kind: "address"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  /** Numbered clauses: "1. Title. Text". */
  | { kind: "clauses"; items: Array<{ title: string; text: string }> }
  | { kind: "bullets"; items: string[] }
  | { kind: "signatures"; parties: Array<{ heading: string; lines: string[] }> }
  /** Blanks completed by hand after printing: "Name: ________". */
  | { kind: "fillIn"; parties: Array<{ heading?: string; fields: string[] }> };

export interface DocumentTemplate {
  id: string;
  name: string;
  /** Short name for file names and tags, e.g. "NDA". */
  short: string;
  description: string;
  fields: TemplateField[];
  blocks: TemplateBlock[];
  /** Print the faint JVA logo and web address behind every page, marking it as issued by JVA. */
  watermark?: boolean;
}

const location = (listing: Listing) => `${listing.area}, ${listing.city}, ${listing.state} State`;

/** Company details used on every template. */
const companyFields: TemplateField[] = [
  { key: "companyName", label: "Company name", group: "Joint Venture Assets", defaultValue: "Joint Venture Assets" },
  { key: "companyAddress", label: "Company address", group: "Joint Venture Assets", defaultValue: "Lagos, Nigeria", hint: "Shown in the letterhead" },
  { key: "companyEmail", label: "Company email", group: "Joint Venture Assets", defaultValue: "info@jointventureassets.com" },
  { key: "signatoryName", label: "Signatory name", group: "Joint Venture Assets", defaultValue: "" },
  { key: "signatoryTitle", label: "Signatory title", group: "Joint Venture Assets", defaultValue: "Managing Director" },
];

const propertyFields: TemplateField[] = [
  { key: "propertyTitle", label: "Property", group: "Property", fromListing: (l) => l.title },
  { key: "propertyLocation", label: "Location", group: "Property", fromListing: location },
  { key: "propertyReference", label: "JVA reference", group: "Property", hint: "The listing ID", fromListing: (l) => l.id.toUpperCase() },
];

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "nda",
    name: "Non-Disclosure Agreement",
    short: "NDA",
    description: "Sign before sharing title documents, survey plans or the owner's details with a prospective investor or buyer.",
    fields: [
      { key: "agreementDate", label: "Date of agreement", group: "Agreement", kind: "date", defaultValue: "today" },
      { key: "recipientName", label: "Recipient's full name or company", group: "Recipient" },
      { key: "recipientAddress", label: "Recipient's address", group: "Recipient" },
      { key: "recipientSignatory", label: "Signing for the recipient", group: "Recipient", hint: "Leave as the recipient's name if an individual" },
      ...propertyFields,
      { key: "termYears", label: "Confidentiality period (years)", group: "Agreement", defaultValue: "2" },
      { key: "governingState", label: "Governing law (state)", group: "Agreement", defaultValue: "Lagos State" },
      ...companyFields,
    ],
    blocks: [
      { kind: "title", text: "Non-Disclosure Agreement" },
      {
        kind: "paragraph",
        text: "This Non-Disclosure Agreement (the \"Agreement\") is made on {{agreementDate}} between {{companyName}} of {{companyAddress}} (the \"Disclosing Party\") and {{recipientName}} of {{recipientAddress}} (the \"Recipient\").",
      },
      {
        kind: "paragraph",
        text: "The Disclosing Party is prepared to share information about the property described as {{propertyTitle}}, located at {{propertyLocation}} (JVA reference {{propertyReference}}) (the \"Property\"), so that the Recipient can evaluate a possible transaction (the \"Purpose\").",
      },
      {
        kind: "clauses",
        items: [
          { title: "Confidential Information", text: "Means all information about the Property and its owner disclosed by the Disclosing Party in any form, including title documents, survey plans, valuations, prices, sharing formulas, and the identity and contact details of the owner." },
          { title: "Obligations", text: "The Recipient shall keep the Confidential Information strictly confidential, use it only for the Purpose, and not disclose it to any third party except its professional advisers who are bound by equal duties of confidence." },
          { title: "No circumvention", text: "The Recipient shall not, directly or through any other person, contact, negotiate or transact with the owner of the Property except through the Disclosing Party, for the duration of this Agreement." },
          { title: "Exclusions", text: "These obligations do not apply to information that is or becomes public through no fault of the Recipient, was lawfully held by the Recipient before disclosure, or must be disclosed by law or court order." },
          { title: "Return of information", text: "On request, the Recipient shall promptly return or destroy all Confidential Information and any copies." },
          { title: "Term", text: "This Agreement takes effect on the date above and continues for {{termYears}} years." },
          { title: "Governing law", text: "This Agreement is governed by the laws of {{governingState}}, Federal Republic of Nigeria." },
        ],
      },
      {
        kind: "signatures",
        parties: [
          { heading: "For and on behalf of {{companyName}}", lines: ["Name: {{signatoryName}}", "Title: {{signatoryTitle}}", "Date:"] },
          { heading: "For and on behalf of {{recipientName}}", lines: ["Name: {{recipientSignatory}}", "Date:"] },
        ],
      },
    ],
  },
  {
    id: "loi",
    name: "Letter of Intent",
    short: "LOI",
    description:
      "From a developer to a landowner: the proposed JV development, each party's contributions, the sharing arrangement and conditions, before the formal JV Agreement.",
    fields: [
      {
        key: "developerLetterhead",
        label: "Developer's letterhead",
        group: "Letterhead",
        kind: "image",
        optional: true,
        hint: "Upload their letterhead (PNG or JPG); the LOI is printed on it. Filled in automatically from a JV enquiry. Leave empty to use a typed letterhead.",
      },
      { key: "letterDate", label: "Date", group: "Letter", kind: "date", defaultValue: "today" },
      { key: "referenceNumber", label: "Reference number", group: "Letter" },
      { key: "exclusivityDays", label: "Exclusivity period (days)", group: "Letter", hint: "Section 6" },
      { key: "validityDays", label: "LOI valid for (days)", group: "Letter", defaultValue: "30", hint: "Section 12" },

      { key: "developerName", label: "Developer company name", group: "Developer (sender)" },
      { key: "developerRcNumber", label: "RC number", group: "Developer (sender)", hint: "Digits only, e.g. 1234567" },
      { key: "developerAddress", label: "Company address", group: "Developer (sender)" },
      { key: "developerPhone", label: "Company phone", group: "Developer (sender)", optional: true, hint: "For the typed letterhead" },
      { key: "developerEmail", label: "Company email", group: "Developer (sender)", optional: true, hint: "For the typed letterhead" },
      { key: "developerSignatory", label: "Authorized signatory", group: "Developer (sender)" },
      { key: "developerPosition", label: "Signatory's position", group: "Developer (sender)" },

      { key: "landownerName", label: "Landowner name / company name", group: "Landowner (recipient)" },
      { key: "landownerAddress", label: "Landowner address", group: "Landowner (recipient)" },
      { key: "contactPerson", label: "Attention (contact person)", group: "Landowner (recipient)" },
      { key: "landownerPhone", label: "Phone number", group: "Landowner (recipient)" },
      { key: "landownerEmail", label: "Email address", group: "Landowner (recipient)" },
      { key: "landownerSignatory", label: "Authorized signatory", group: "Landowner (recipient)", hint: "Who signs the acceptance" },
      { key: "landownerPosition", label: "Signatory's position", group: "Landowner (recipient)" },

      { key: "propertyAddress", label: "Property address", group: "Property" },
      { key: "propertyLocation", label: "Property location", group: "Property", fromListing: location },
      { key: "landSize", label: "Land size (sqm)", group: "Property", kind: "number", fromListing: (l) => (l.sizeSqm > 0 ? l.sizeSqm.toLocaleString("en-NG") : "") },
      { key: "titleDocument", label: "Title document", group: "Property", fromListing: (l) => l.titleDocument },
      { key: "surveyNumber", label: "Survey plan number", group: "Property", optional: true },
      { key: "landValue", label: "Land value (₦)", group: "Property", kind: "number", hint: "Numbers only; ₦ is added", fromListing: (l) => (isLandValueTbd(l) ? "" : l.price.toLocaleString("en-NG")) },
      { key: "propertyDescription", label: "Property description", group: "Property", kind: "textarea", fromListing: (l) => l.description },

      { key: "projectType", label: "Project type", group: "Proposed development", hint: "Residential, Commercial or Mixed-use" },
      { key: "projectDescription", label: "Project description", group: "Proposed development", kind: "textarea", fromListing: (l) => l.jv?.proposal ?? "" },
      { key: "numberOfUnits", label: "Estimated number of units", group: "Proposed development", kind: "number" },
      { key: "developmentPeriod", label: "Estimated development period", group: "Proposed development", hint: "e.g. 24 months", fromListing: (l) => l.jv?.duration ?? "" },

      { key: "landownerShare", label: "Option A: landowner share (%)", group: "Sharing arrangement", optional: true, hint: "Fill the option(s) you're proposing; the rest print as blank lines", fromListing: (l) => l.jv?.sharingFormula.split("/")[0] ?? "" },
      { key: "developerShare", label: "Option A: developer share (%)", group: "Sharing arrangement", optional: true, fromListing: (l) => l.jv?.sharingFormula.split("/")[1] ?? "" },
      { key: "landownerUnits", label: "Option B: number of units for the landowner", group: "Sharing arrangement", kind: "number", optional: true },
      { key: "unitType", label: "Option B: unit type", group: "Sharing arrangement", optional: true, hint: "e.g. 3-bedroom flats" },
      { key: "hybridDetails", label: "Option C: hybrid structure details", group: "Sharing arrangement", kind: "textarea", optional: true },

      { key: "estimatedGdv", label: "Estimated GDV (₦)", group: "Schedule A: project summary", kind: "number", optional: true, hint: "Gross development value" },
      { key: "estimatedCost", label: "Estimated project cost (₦)", group: "Schedule A: project summary", kind: "number", optional: true },
      { key: "sharingRatio", label: "Proposed sharing ratio", group: "Schedule A: project summary", hint: "Landowner / developer, e.g. 40/60", fromListing: (l) => l.jv?.sharingFormula ?? "" },
    ],
    blocks: [
      {
        kind: "partyLetterhead",
        name: "{{developerName}}",
        details: ["RC {{developerRcNumber}}", "{{developerAddress}}", "{{developerPhone}}", "{{developerEmail}}"],
        image: "developerLetterhead",
      },
      { kind: "address", lines: ["Date: {{letterDate}}", "Ref No.: {{referenceNumber}}"] },
      {
        kind: "address",
        lines: [
          "To:",
          "{{landownerName}}",
          "Address: {{landownerAddress}}",
          "Attention: {{contactPerson}}",
          "Phone: {{landownerPhone}}",
          "Email: {{landownerEmail}}",
        ],
      },
      { kind: "title", text: "Letter of Intent for Joint Venture Property Development" },
      { kind: "paragraph", text: "Dear Sir/Madam," },
      { kind: "paragraph", text: "We refer to our discussions regarding the proposed Joint Venture Development of the property situated at {{propertyAddress}}." },
      {
        kind: "paragraph",
        text: "This Letter of Intent (\"LOI\") outlines the preliminary terms and understanding between {{developerName}} (\"Developer\") and {{landownerName}} (\"Landowner\").",
      },

      { kind: "heading", text: "1. PROPERTY DETAILS" },
      {
        kind: "address",
        lines: [
          "Location: {{propertyLocation}}",
          "Land Size: {{landSize}} sqm",
          "Title Document: {{titleDocument}}",
          "Survey Plan Number: {{surveyNumber}}",
          "Land Value: ₦{{landValue}}",
          "Property Description: {{propertyDescription}}",
        ],
      },

      { kind: "heading", text: "2. PROPOSED DEVELOPMENT" },
      {
        kind: "address",
        lines: [
          "Project Type: {{projectType}}",
          "Description: {{projectDescription}}",
          "Estimated Number of Units: {{numberOfUnits}}",
          "Estimated Development Period: {{developmentPeriod}}",
        ],
      },

      { kind: "heading", text: "3. CONTRIBUTIONS OF THE PARTIES" },
      { kind: "heading", text: "LANDOWNER'S CONTRIBUTION" },
      {
        kind: "bullets",
        items: [
          "The property described herein",
          "Relevant title documents",
          "Necessary consents and authorizations",
          "Peaceful possession throughout development",
          "Cooperation in obtaining approvals",
        ],
      },
      { kind: "heading", text: "DEVELOPER'S CONTRIBUTION" },
      {
        kind: "bullets",
        items: [
          "Project funding",
          "Architectural and engineering designs",
          "Statutory approvals and permits",
          "Construction and project management",
          "Marketing and sales activities",
          "Consultancy services",
          "Infrastructure and utilities",
        ],
      },

      { kind: "heading", text: "4. PROPOSED SHARING ARRANGEMENT" },
      { kind: "heading", text: "OPTION A: REVENUE/PROFIT SHARE" },
      { kind: "address", lines: ["Landowner: {{landownerShare}}%", "Developer: {{developerShare}}%"] },
      { kind: "heading", text: "OPTION B: UNIT ALLOCATION" },
      { kind: "address", lines: ["Landowner Allocation:", "{{landownerUnits}} Units of {{unitType}}", "", "Developer Allocation:", "Remaining Units"] },
      { kind: "heading", text: "OPTION C: HYBRID STRUCTURE" },
      { kind: "paragraph", text: "{{hybridDetails}}" },

      { kind: "heading", text: "5. DUE DILIGENCE" },
      {
        kind: "paragraph",
        text: "The Developer shall undertake due diligence including title verification, survey verification, inspections, regulatory compliance review, feasibility assessment, environmental review, and market analysis.",
      },
      { kind: "heading", text: "6. EXCLUSIVITY" },
      { kind: "paragraph", text: "The Landowner agrees not to negotiate with other developers for {{exclusivityDays}} days from execution of this LOI." },
      { kind: "heading", text: "7. CONFIDENTIALITY" },
      { kind: "paragraph", text: "Both parties shall keep all exchanged information confidential except where disclosure is legally required." },
      { kind: "heading", text: "8. DEVELOPMENT APPROVALS" },
      { kind: "paragraph", text: "The project shall be subject to obtaining all necessary regulatory approvals." },
      { kind: "heading", text: "9. CONDITIONS PRECEDENT" },
      {
        kind: "bullets",
        items: [
          "Successful due diligence",
          "Verification of title",
          "Agreement on project economics",
          "Agreement on project structure",
          "Management/board approvals",
          "Execution of a formal JV Agreement",
          "Compliance with legal requirements",
        ],
      },
      { kind: "heading", text: "10. COSTS" },
      { kind: "paragraph", text: "Each party shall bear its own costs unless otherwise agreed in writing." },
      { kind: "heading", text: "11. NON-BINDING NATURE" },
      {
        kind: "paragraph",
        text: "Except for Exclusivity, Confidentiality, and Costs, this LOI is non-binding and does not constitute a Joint Venture Agreement.",
      },
      { kind: "heading", text: "12. VALIDITY PERIOD" },
      { kind: "paragraph", text: "This LOI shall remain valid for {{validityDays}} days from issuance unless extended." },
      { kind: "heading", text: "13. ACCEPTANCE" },
      { kind: "paragraph", text: "If acceptable, kindly sign and return a copy of this LOI." },

      { kind: "heading", text: "FOR THE DEVELOPER" },
      {
        kind: "address",
        lines: [
          "Company Name: {{developerName}}",
          "RC Number: {{developerRcNumber}}",
          "Address: {{developerAddress}}",
          "Authorized Signatory: {{developerSignatory}}",
          "Position: {{developerPosition}}",
        ],
      },
      { kind: "fillIn", parties: [{ fields: ["Signature", "Date"] }] },

      { kind: "heading", text: "ACCEPTANCE BY LANDOWNER" },
      {
        kind: "address",
        lines: [
          "Landowner Name/Company Name: {{landownerName}}",
          "Authorized Signatory: {{landownerSignatory}}",
          "Position: {{landownerPosition}}",
        ],
      },
      { kind: "fillIn", parties: [{ fields: ["Signature", "Date"] }] },
      { kind: "address", lines: ["Phone: {{landownerPhone}}", "Email: {{landownerEmail}}", "Address: {{landownerAddress}}"] },

      { kind: "heading", text: "SCHEDULE A: PROJECT SUMMARY" },
      {
        kind: "address",
        lines: [
          "Property Location: {{propertyLocation}}",
          "Land Size: {{landSize}} sqm",
          "Land Value: ₦{{landValue}}",
          "Proposed Development: {{projectType}}",
          "Number of Units: {{numberOfUnits}}",
          "Estimated GDV: ₦{{estimatedGdv}}",
          "Estimated Project Cost: ₦{{estimatedCost}}",
          "Proposed Sharing Ratio: {{sharingRatio}}",
          "Development Period: {{developmentPeriod}}",
        ],
      },
    ],
  },
  {
    id: "facilitation",
    name: "Facilitation Fee Agreement",
    watermark: true,
    short: "Facilitation fee agreement",
    description:
      "Records Joint Venture Assets as the source of a JV transaction, the 10% facilitation fee on the agreed land value, and non-circumvention.",
    fields: [
      { key: "agreementDate", label: "Date of agreement", group: "Agreement", kind: "date", defaultValue: "today" },
      { key: "termMonths", label: "Agreement period (months)", group: "Agreement", defaultValue: "12", hint: "12 or 24" },
      { key: "clientName", label: "Client name / company name", group: "Client (Party A, the Developer)" },
      { key: "clientAddress", label: "Client address", group: "Client (Party A, the Developer)" },
      { key: "propertyDescription", label: "Property description", group: "Property", kind: "textarea", fromListing: (l) => l.title },
      { key: "propertyLocation", label: "Property location", group: "Property", fromListing: location },
      { key: "landSize", label: "Land size", group: "Property", hint: "e.g. 2,400 sqm", fromListing: (l) => (l.sizeSqm > 0 ? formatSize(l.sizeSqm) : "") },
      { key: "companyName", label: "Company name", group: "Joint Venture Assets (Party B, the Facilitator)", defaultValue: "Joint Venture Assets" },
      { key: "companyAddress", label: "Company address", group: "Joint Venture Assets (Party B, the Facilitator)", defaultValue: "Lagos, Nigeria" },
      { key: "companyEmail", label: "Company email", group: "Joint Venture Assets (Party B, the Facilitator)", defaultValue: "info@jointventureassets.com", hint: "Shown in the letterhead" },
    ],
    blocks: [
      { kind: "letterhead", align: "center" },
      { kind: "title", text: "Facilitation Fee Agreement" },
      { kind: "date", text: "Date: {{agreementDate}}" },
      { kind: "paragraph", text: "THIS FACILITATION FEE AGREEMENT is made between:" },
      { kind: "heading", text: "PARTY A:" },
      { kind: "address", lines: ["{{clientName}}", "Address: {{clientAddress}}", "(hereinafter referred to as \"Developer\")"] },
      { kind: "paragraph", text: "AND" },
      { kind: "heading", text: "PARTY B:" },
      { kind: "address", lines: ["{{companyName}}", "Address: {{companyAddress}}", "(hereinafter referred to as \"the Facilitator\")"] },
      { kind: "heading", text: "WHEREAS:" },
      {
        kind: "paragraph",
        text: "A. The Facilitator has introduced or intends to introduce the Client to a property owner, developer, investor, financier, or business opportunity relating to a Joint Venture transaction.",
      },
      {
        kind: "paragraph",
        text: "B. The Client acknowledges the role of the Facilitator in sourcing, introducing, negotiating, and facilitating the transaction.",
      },
      { kind: "heading", text: "NOW IT IS HEREBY AGREED AS FOLLOWS:" },
      { kind: "heading", text: "APPOINTMENT" },
      { kind: "paragraph", text: "The Client hereby recognizes the Facilitator as the originating source of the transaction concerning:" },
      { kind: "address", lines: ["Property Description: {{propertyDescription}}", "Location: {{propertyLocation}}", "Land Size: {{landSize}}"] },
      { kind: "heading", text: "FACILITATION FEE" },
      {
        kind: "paragraph",
        text: "In consideration of the introduction and facilitation services rendered by the Facilitator, the Developer shall pay the Facilitator a fee equivalent to Ten Percent (10%) of the agreed Land Value. The Facilitation Fee shall become due and payable immediately upon the execution of the Joint Venture Agreement and shall be paid on the same day and at the point of execution of the Joint Venture Agreement, as a condition precedent to the commencement of the Joint Venture. The Developer shall ensure that the Facilitation Fee is available and ready for payment on the execution date, and payment shall be made immediately following the signing of the Joint Venture Agreement and prior to the commencement of any development, construction, site mobilization, or project activities.",
      },
      { kind: "heading", text: "SUCCESSFUL TRANSACTION" },
      { kind: "paragraph", text: "A transaction shall be deemed successful upon:" },
      {
        kind: "bullets",
        items: [
          "Execution of a Joint Venture Agreement;",
          "Payment of facilitation fee;",
          "Acquisition of the property;",
          "Receipt of any consideration arising from the transaction;",
        ],
      },
      { kind: "heading", text: "NON-CIRCUMVENTION" },
      {
        kind: "paragraph",
        text: "The Client agrees not to bypass, avoid, circumvent, or exclude the Facilitator in any dealings arising from the introduction made by the Facilitator.",
      },
      {
        kind: "paragraph",
        text: "Should the Client proceed directly or indirectly with any party introduced by the Facilitator, the Facilitation Fee shall remain payable.",
      },
      { kind: "heading", text: "CONFIDENTIALITY" },
      { kind: "paragraph", text: "Both parties agree to maintain confidentiality regarding all information exchanged in relation to the transaction." },
      { kind: "heading", text: "TERM" },
      { kind: "paragraph", text: "This Agreement shall remain valid for a period of {{termMonths}} months from the date of execution." },
      { kind: "heading", text: "GOVERNING LAW" },
      { kind: "paragraph", text: "This Agreement shall be governed by the laws of the Federal Republic of Nigeria." },
      { kind: "heading", text: "DISPUTE RESOLUTION" },
      {
        kind: "paragraph",
        text: "Any dispute arising from this Agreement shall first be resolved amicably. Where settlement cannot be reached, the dispute shall be referred to arbitration in Lagos State, Nigeria.",
      },
      { kind: "paragraph", text: "IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above." },
      {
        kind: "fillIn",
        parties: [
          { heading: "FOR THE CLIENT", fields: ["Name", "Company", "Signature", "Date"] },
          { heading: "FOR THE FACILITATOR", fields: ["Name", "Company", "Signature", "Date"] },
          { heading: "WITNESS", fields: ["Name", "Address", "Signature"] },
        ],
      },
    ],
  },
];
