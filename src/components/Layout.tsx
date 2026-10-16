import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaArrowRotateLeft,
  FaArrowUpRightFromSquare,
  FaBuilding,
  FaChartPie,
  FaEnvelope,
  FaFileContract,
  FaFilePen,
  FaFileSignature,
  FaHouseCircleCheck,
  FaInbox,
  FaRightFromBracket,
  FaUsers,
} from "react-icons/fa6";
import { logout, useSession } from "@/hooks/useAuth";
import { useNavCounts } from "@/hooks/useNavCounts";
import { resetDemoData } from "@/lib/mockApi";
import { resetInbox } from "@/lib/inboxApi";
import { cx } from "@/lib/format";
import { websiteUrl } from "@/data/site";

const sections = [
  {
    title: "Manage",
    links: [
      { to: "/", label: "Overview", icon: FaChartPie, end: true },
      { to: "/requests", label: "Requests", icon: FaFileSignature, end: false },
      { to: "/listings", label: "Listings", icon: FaBuilding, end: false },
      { to: "/drafts", label: "Drafts", icon: FaFilePen, end: false },
      { to: "/users", label: "Users", icon: FaUsers, end: false },
    ],
  },
  {
    title: "Inbox",
    links: [
      { to: "/enquiries", label: "Enquiries", icon: FaInbox, end: false },
      { to: "/listing-requests", label: "Listing requests", icon: FaHouseCircleCheck, end: false },
      { to: "/messages", label: "Messages", icon: FaEnvelope, end: false },
    ],
  },
  {
    title: "Documents",
    links: [{ to: "/templates", label: "Templates", icon: FaFileContract, end: false }],
  },
];

/** Ink sidebar on desktop, a scrolling tab strip on phones; pages render beside it. */
export function Layout() {
  const session = useSession();
  const counts = useNavCounts();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const resetData = async () => {
    if (!window.confirm("Put every request, listing, user, message, enquiry and listing request back to the demo data?")) return;
    resetDemoData();
    // Enquiries and listing requests live in the website's demo inbox.
    await resetInbox().catch(() => undefined);
    window.location.reload();
  };

  return (
    <div className="min-h-svh text-fg lg:grid lg:grid-cols-[16.5rem_1fr] print:block">
      <aside className="theme-dark bg-ink lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col print:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6 lg:py-7">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={500} height={500} className="h-12 w-12 object-contain" />
            <span className="leading-tight">
              <span className="block font-display text-lg text-fg">Joint Venture Assets</span>
              <span className="label block text-gold">Admin</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-fg lg:hidden"
          >
            <FaRightFromBracket aria-hidden="true" /> Sign out
          </button>
        </div>

        <nav aria-label="Dashboard" className="overflow-x-auto px-3 pb-3 lg:flex-1 lg:px-4 lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {sections.flatMap((section, index) => [
              <li key={section.title} className={index ? "hidden px-3.5 pt-5 pb-2 lg:block" : "hidden px-3.5 pb-2 lg:block"}>
                <p className="label text-ash">{section.title}</p>
              </li>,
              ...section.links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx(
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                      isActive ? "bg-gold text-ink" : "text-muted hover:bg-raised hover:text-fg",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon aria-hidden="true" className="shrink-0" />
                      {label}
                      {counts[to] ? (
                        <span
                          className={cx("ml-auto min-w-6 rounded-full px-1.5 text-center text-xs font-bold", isActive ? "bg-ink text-gold" : "bg-gold text-ink")}
                          aria-label={`${counts[to]} to look at`}
                        >
                          {counts[to]}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
              )),
            ])}
          </ul>
        </nav>

        <div className="hidden border-t border-fg/10 px-6 py-5 lg:block">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 px-2.5 py-1 text-[0.6875rem] font-semibold text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Demo data
          </p>
          <p className="truncate text-sm font-semibold text-fg">{session?.name}</p>
          <p className="truncate text-xs text-muted">{session?.email}</p>
          <div className="mt-4 flex flex-col gap-2.5 text-xs font-semibold">
            <a href={websiteUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-muted hover:text-fg">
              <FaArrowUpRightFromSquare aria-hidden="true" /> View website
            </a>
            <button type="button" onClick={resetData} className="inline-flex items-center gap-2 text-muted hover:text-fg">
              <FaArrowRotateLeft aria-hidden="true" /> Reset demo data
            </button>
            <button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-muted hover:text-fg">
              <FaRightFromBracket aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
