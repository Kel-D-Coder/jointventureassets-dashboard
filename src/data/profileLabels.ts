/**
 * The questions members answer in "Complete your profile" on the website.
 * Mirrors components/auth/ProfileFields.tsx there (same keys, same rules for
 * which role and category see which question); change both together.
 */

interface ProfileQuestion {
  key: string;
  label: string;
  required: boolean;
  /** Long answers that read better across the full width. */
  wide?: boolean;
}

const q = (key: string, label: string, required = true, wide = false): ProfileQuestion => ({ key, label, required, wide });

const organization = [q("organizationType", "Organisation type"), q("registrationLicenseNumber", "Registration / licence number")];

/** Every profile question the member was asked, in the order the form asks them. */
export function profileQuestionsFor(role: string, category: string): ProfileQuestion[] {
  const isIndividual = category === "Individual";
  if (role === "Landowner") {
    return [
      ...(category === "Cooperative" || category === "Government" ? organization : []),
      q("landLocation", "Land location"),
      q("landSize", "Land size"),
      q("documentationStatus", "Documentation status"),
      q("preferredPartnershipType", "Preferred deal"),
      q("landDescription", "About the land", true, true),
    ];
  }
  if (role === "Buyer") {
    return [
      ...(isIndividual ? [] : organization),
      q("propertyWanted", "Looking to buy"),
      q("budgetRange", "Budget range"),
      q("preferredLocation", "Preferred location"),
      q("purpose", "Purpose"),
      q("timeline", "When they want to buy"),
      q("paymentMethod", "How they'll pay"),
      q("companyName", "Company name", false),
    ];
  }
  if (role === "Investor") {
    return [
      q("investmentType", "Investment type"),
      ...(isIndividual ? [] : organization),
      q("budgetRange", "Budget range"),
      q("preferredLocation", "Preferred location"),
      q("projectType", "Project type"),
      q("yearsOfExperience", "Years of experience"),
      q("companyName", "Company name", false),
    ];
  }
  return [];
}

/**
 * The member's profile as a list of every question with their answer (or ""),
 * followed by any extra answers from older sign-ups that the form no longer asks.
 */
export function fullProfile(role: string, category: string, profile: Record<string, string>) {
  const questions = profileQuestionsFor(role, category);
  const asked = new Set(questions.map((question) => question.key));
  const extras = Object.keys(profile)
    .filter((key) => !asked.has(key) && key !== "role" && profile[key]?.trim())
    .map((key) => q(key, key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), false));
  return [...questions, ...extras].map((question) => ({ ...question, value: profile[question.key]?.trim() ?? "" }));
}
