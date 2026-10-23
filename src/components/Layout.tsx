import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowRotateLeft,
  FaArrowUpRightFromSquare,
  FaBuilding,
  FaChartPie,
  FaEnvelope,
  FaFileContract,
  FaFilePen,
  FaFileSignature,
  FaHandshake,
  FaHouseCircleCheck,
  FaInbox,
  FaRightFromBracket,
  FaUsers,
} from "react-icons/fa6";
import { logout, useSession } from "@/hooks/useAuth";
import { useNavCounts } from "@/hooks/useNavCounts";
import { isDemoSession } from "@/lib/api";
import { resetDemoData } from "@/lib/demoApi";
import { cx, initials } from "@/lib/format";
import { websiteUrl } from "@/data/site";

const sections = [
  {
    title: "Manage",
    links: [
      { to: "/", label: "Overview", icon: FaChartPie, end: true },
      { to: "/requests", label: "Requests", icon: FaFileSignature, end: false },
      { to: "/listings", label: "Listings", icon: FaBuilding, end: false },
      { to: "/drafts", label: "Drafts", icon: FaFilePen, end: false },
      { to: "/closed-deals", label: "Closed deals", icon: FaHandshake, end: false },
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

/** "Listings" for /listings/lst-1001, "Overview" for /. */
function sectionFor(pathname: string) {
  for (const section of sections) {
    for (const link of section.links) {
      if (link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`)) return { section: section.title, page: link.label };
    }
  }
  return { section: "Manage", page: "" };
}

/** Ink sidebar and a slim top bar on desktop; on phones the sidebar becomes a scrolling tab strip. */
export function Layout() {
  const session = useSession();
  const counts = useNavCounts();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const where = sectionFor(pathname);

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const resetData = () => {
    if (!window.confirm("Put every demo enquiry and message back the way it started?")) return;
    resetDemoData();
    window.location.reload();
  };

  return (
    <div className="min-h-svh text-fg lg:grid lg:grid-cols-[15.5rem_1fr] print:block">
      <aside className="theme-dark bg-ink lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col print:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 lg:px-5 lg:pt-6 lg:pb-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" width={500} height={500} className="h-9 w-9 object-contain" />
            <span className="leading-tight">
              <span className="block font-serif text-[0.9375rem] text-fg">Joint Venture Assets</span>
              <span className="block text-[0.6875rem] font-semibold tracking-wide text-gold">Admin console</span>
            </span>
          </Link>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-fg lg:hidden">
            <FaRightFromBracket aria-hidden="true" /> Sign out
          </button>
        </div>

        <nav aria-label="Dashboard" className="no-scrollbar overflow-x-auto px-3 pb-3 lg:flex-1 lg:overflow-x-visible lg:overflow-y-auto lg:pb-4">
          <ul className="flex gap-0.5 lg:flex-col">
            {sections.flatMap((section, index) => [
              <li key={section.title} className={cx("hidden px-3 pb-1.5 lg:block", index ? "pt-5" : "pt-1")}>
                <p className="text-[0.6875rem] font-semibold tracking-wider text-ash uppercase">{section.title}</p>
              </li>,
              ...section.links.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cx(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                        isActive ? "bg-white/[0.08] text-white" : "text-muted hover:bg-white/[0.04] hover:text-fg",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? <span aria-hidden="true" className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-gold lg:block" /> : null}
                        <Icon aria-hidden="true" className={cx("shrink-0 text-[0.875rem]", isActive ? "text-gold" : "text-ash")} />
                        {label}
                        {counts[to] ? (
                          <span
                            className={cx(
                              "ml-auto min-w-5 rounded-md px-1.5 text-center text-[0.6875rem] leading-5 font-semibold",
                              isActive ? "bg-gold text-ink" : "bg-white/10 text-fg",
                            )}
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

        <div className="hidden border-t border-white/[0.07] p-3 lg:block">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-[0.6875rem] font-bold text-ink">
              {initials(session?.name ?? "Admin")}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[0.8125rem] font-semibold text-fg">{session?.name}</span>
              <span className="block truncate text-xs text-muted">{session?.email}</span>
            </span>
            <button type="button" onClick={signOut} title="Sign out" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-white/[0.06] hover:text-fg">
              <FaRightFromBracket aria-hidden="true" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-between gap-4 border-b border-fg/[0.07] bg-raised/85 px-6 backdrop-blur lg:flex lg:px-10 print:hidden">
          <p className="text-sm text-muted">
            {where.section}
            {where.page ? (
              <>
                <span className="mx-2 text-ash">/</span>
                <span className="font-semibold text-fg">{where.page}</span>
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            {isDemoSession() ? (
              <>
                <span className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-gold-soft/70 px-2.5 py-1 text-[0.6875rem] font-semibold text-gold-deep">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Demo data
                </span>
                <button
                  type="button"
                  onClick={resetData}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-muted hover:bg-fg/[0.05] hover:text-fg"
                >
                  <FaArrowRotateLeft aria-hidden="true" /> Reset demo
                </button>
              </>
            ) : null}
            <a
              href={websiteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-fg/[0.12] bg-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-fg shadow-xs hover:bg-surface"
            >
              View website <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
            </a>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
