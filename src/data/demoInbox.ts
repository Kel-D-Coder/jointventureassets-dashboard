import type { InboxEnquiry } from "@/types";

/** Demo enquiries, as the website's demo inbox used to send them. The listings they ask about were demo listings. */

const demoListings: Record<string, { title: string; subtitle: string; image: string }> = {
  "lst-1001": { title: "2,400 sqm corner plot for luxury apartments", subtitle: "Lekki Phase 1, Lekki", image: "/placeholders/tower-02.jpg" },
  "lst-1002": { title: "Detached 5-bedroom duplex with BQ", subtitle: "Maitama, Abuja", image: "/placeholders/tower-03.jpg" },
  "lst-1003": { title: "5-hectare estate land on the coastal road", subtitle: "Eleko, Ibeju-Lekki", image: "/placeholders/estate-01.jpg" },
  "lst-1004": { title: "Office block on a main road, fully let", subtitle: "Victoria Island, Lagos", image: "/placeholders/tower-01.jpg" },
  "lst-1006": { title: "Serviced plot in a gated estate", subtitle: "Sangotedo, Ajah", image: "/placeholders/estate-01.jpg" },
  "lst-1011": { title: "Waterfront land for a resort", subtitle: "Okun Ajah, Lekki", image: "/placeholders/tower-02.jpg" },
};

function listingTarget(id: string): InboxEnquiry["target"] {
  return { type: "listing", id, ...demoListings[id] };
}

function requestTarget(id: string, title: string, subtitle: string): InboxEnquiry["target"] {
  return { type: "request", id, title, subtitle };
}

export const seedEnquiries: InboxEnquiry[] = [
  { id: "enq-01", kind: "enquiry", target: listingTarget("lst-1003"), fullName: "Capitol Real Estate Fund", email: "deals@capitolfund.example.com", phoneNumber: "+234 701 300 5500", message: "We're interested in partnering on the Eleko estate land. Please share the survey plan and the excision gazette.", jv: { generateLoi: true, letterhead: { name: "Capitol letterhead.png", type: "image/png", size: 19973, url: "/placeholders/letterhead-capitol.png" }, acceptedFeeTerms: true }, status: "new", createdAt: "2026-10-12T16:40:00+01:00" },
  { id: "enq-02", kind: "enquiry", target: listingTarget("lst-1002"), fullName: "Halima Yusuf", email: "halima.y@example.com", phoneNumber: "+234 803 559 8800", message: "I'm interested in buying the Maitama duplex. Please arrange an inspection. Weekday afternoons work best.", status: "new", createdAt: "2026-10-12T11:05:00+01:00" },
  { id: "enq-03", kind: "enquiry", target: listingTarget("lst-1001"), fullName: "Femi Ogunleye", email: "femi@ogunleyebuild.example.com", phoneNumber: "+234 805 410 2299", message: "We've delivered three apartment blocks in Lekki. Keen to discuss the 40/60 formula on the corner plot.", jv: { generateLoi: false, acceptedFeeTerms: true }, status: "new", createdAt: "2026-10-11T19:20:00+01:00" },
  { id: "enq-04", kind: "enquiry", target: listingTarget("lst-1006"), fullName: "Uche Nnamdi", email: "uche.n@example.com", phoneNumber: "+234 816 774 0021", message: "Is the Sangotedo plot still available? I can pay outright this month.", status: "contacted", createdAt: "2026-10-10T09:15:00+01:00" },
  { id: "enq-05", kind: "enquiry", target: listingTarget("lst-1011"), fullName: "Seaside Hospitality Ltd", email: "projects@seaside.example.com", phoneNumber: "+234 703 990 1200", message: "We build boutique resorts and would like the full JV terms for the Okun Ajah waterfront.", jv: { generateLoi: true, letterhead: { name: "Seaside letterhead.png", type: "image/png", size: 20980, url: "/placeholders/letterhead-seaside.png" }, acceptedFeeTerms: true }, status: "new", createdAt: "2026-10-09T10:30:00+01:00" },
  { id: "enq-06", kind: "enquiry", target: listingTarget("lst-1004"), fullName: "Obinna Okafor", email: "obinna.okafor@example.com", phoneNumber: "+234 802 118 7744", message: "Please send the tenancy schedule and service-charge accounts for the VI office block.", status: "closed", createdAt: "2026-10-05T12:45:00+01:00" },
  { id: "enq-07", kind: "enquiry", target: requestTarget("req-2001", "Developer wanted for Lekki corner plot", "Land offer · Lekki Phase 1, Lagos"), fullName: "Kayode Adewale", email: "kayode@adewaledev.example.com", phoneNumber: "+234 809 771 4410", message: "We're a developer with four completed projects in Lekki. We'd like to be introduced to the landowner.", status: "new", createdAt: "2026-10-12T09:50:00+01:00" },
  { id: "enq-08", kind: "enquiry", target: requestTarget("req-2008", "State agency seeking developers for mass housing", "Development · Asaba, Delta"), fullName: "Northgate Construction", email: "bids@northgate.example.com", phoneNumber: "+234 703 222 9081", message: "We have PPP housing experience in Edo and Delta. How do we get on the shortlist?", status: "contacted", createdAt: "2026-10-10T15:30:00+01:00" },
  { id: "enq-09", kind: "enquiry", target: requestTarget("req-2003", "Mandate for a 10-hectare government site", "Partnership · Epe, Lagos"), fullName: "Ifeoma Chukwu", email: "ifeoma.c@example.com", phoneNumber: "+234 806 441 3390", message: "Our investor group can fund up to 150 units. Is a partial take-up possible?", status: "new", createdAt: "2026-10-09T08:20:00+01:00" },
];
