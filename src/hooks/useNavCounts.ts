import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { listings } from "@/lib/api";
import { accounts, inboxEnquiries, listingSubmissions } from "@/lib/api";

/** Sidebar badges: how many items in each section need attention. Keyed by the link's path. */
export type NavCounts = Partial<Record<string, number>>;

async function loadCounts(): Promise<NavCounts> {
  // The website's inbox may not be running; its counts are simply left out.
  const [allListings, members, enquiries, submissions] = await Promise.all([
    listings.list(),
    accounts.list().catch(() => []),
    inboxEnquiries.list().catch(() => []),
    listingSubmissions.list().catch(() => []),
  ]);
  return {
    "/drafts": allListings.filter((listing) => listing.status === "draft").length,
    "/users": members.filter((member) => member.status === "pending").length,
    "/enquiries": enquiries.filter((enquiry) => enquiry.status === "new").length,
    "/listing-requests": submissions.filter((submission) => submission.status === "pending").length,
  };
}

/** Recounts whenever the admin moves to another page, so badges catch up after a change. */
export function useNavCounts(): NavCounts {
  const { pathname } = useLocation();
  const [counts, setCounts] = useState<NavCounts>({});

  useEffect(() => {
    let cancelled = false;
    loadCounts()
      .then((next) => !cancelled && setCounts(next))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return counts;
}
