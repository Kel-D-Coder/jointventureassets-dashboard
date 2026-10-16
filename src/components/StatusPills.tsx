import { FaCircleCheck, FaClock, FaCircleXmark } from "react-icons/fa6";
import { dealTypeLabel, listingStatusLabel, requestStatusLabel } from "@/data/labels";
import { Pill, type PillTone } from "@/ui";
import type { DealType, ListingStatus, RequestStatus } from "@/types";

const requestTone: Record<RequestStatus, PillTone> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
};

const requestIcon = {
  pending: FaClock,
  accepted: FaCircleCheck,
  rejected: FaCircleXmark,
};

export function RequestStatusPill({ status }: { status: RequestStatus }) {
  const Icon = requestIcon[status];
  return (
    <Pill tone={requestTone[status]}>
      <Icon aria-hidden="true" /> {requestStatusLabel[status]}
    </Pill>
  );
}

const listingTone: Record<ListingStatus, PillTone> = {
  published: "success",
  draft: "neutral",
  under_offer: "info",
  closed: "danger",
};

export function ListingStatusPill({ status }: { status: ListingStatus }) {
  return <Pill tone={listingTone[status]}>{listingStatusLabel[status]}</Pill>;
}

export function DealTypePill({ dealType }: { dealType: DealType }) {
  return <Pill tone={dealType === "jv" ? "gold" : "ink"}>{dealTypeLabel[dealType]}</Pill>;
}
