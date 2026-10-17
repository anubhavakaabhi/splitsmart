"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/groups", label: "My Groups" },
  { href: "/expenses", label: "Expenses" },
  { href: "/dashboard/activity", label: "Activity" },
];

const accountLinks = [
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

// Profile photo, falling back to an initial if there's no image or it fails to load
function Avatar({
  image,
  fallback,
  size,
}: {
  image?: string | null;
  fallback: string;
  size: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#232937] font-mono text-[13px] text-[#EDEFF3] ${size}`}
    >
      {image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        fallback
      )}
    </span>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "";

  const [menuOpen, setMenuOpen] = useState(false); // desktop avatar dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // mobile slide-down menu

  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Account";
  const fallback = (user?.name ?? user?.email ?? "?").trim()[0]?.toUpperCase() ?? "?";

  // derive the active link from the URL (works on refresh and direct visits)
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  // close everything when the route changes
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // close on outside tap/click and on Escape
  useEffect(() => {
    if (!menuOpen && !mobileOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuOpen && !menuRef.current?.contains(target)) setMenuOpen(false);
      if (mobileOpen && !headerRef.current?.contains(target)) setMobileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, mobileOpen]);

  // if the window grows to desktop width, drop the mobile menu
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMobileOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header
      ref={headerRef}
      className="relative z-40 border-b border-[#1B2029] bg-[#0B0E14]"
    >
      <style>{`
        @keyframes menu-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .menu-anim { animation: menu-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .menu-anim { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#34D399] font-mono text-[13px] font-medium leading-none text-[#0B0E14]">
              S
            </span>
            <span className="font-mono text-[15px] tracking-tight text-[#EDEFF3]">
              SplitSmart
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-6 font-mono text-[13px] lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`transition-colors hover:text-[#EDEFF3] ${
                  isActive(l.href) ? "text-[#EDEFF3]" : "text-[#8B93A7]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* desktop: search + avatar dropdown */}
        <div className="hidden items-center gap-4 lg:flex">
          <input
            type="text"
            placeholder="Search"
            className="w-48 rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-1.5 text-[13px] text-[#EDEFF3] placeholder:text-[#565F73] outline-none focus:border-[#34D399]"
          />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="rounded-full outline-none ring-offset-2 ring-offset-[#0B0E14] focus-visible:ring-2 focus-visible:ring-[#34D399]"
            >
              <Avatar image={user?.image} fallback={fallback} size="h-8 w-8" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="menu-anim absolute right-0 top-11 z-50 w-56 rounded-[6px] border border-[#232937] bg-[#12161F] py-1 font-mono text-[13px] shadow-lg"
              >
                <div className="border-b border-[#1B2029] px-3 py-2.5">
                  <p className="truncate text-[13px] text-[#EDEFF3]">{displayName}</p>
                  {user?.email && (
                    <p className="mt-0.5 truncate text-[11px] text-[#565F73]">{user.email}</p>
                  )}
                </div>

                {accountLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[#8B93A7] transition-colors hover:text-[#EDEFF3]"
                  >
                    {l.label}
                  </Link>
                ))}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full px-3 py-2 text-left text-[#F2726F] transition-colors hover:text-[#EDEFF3]"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[6px] text-[#8B93A7] transition-colors hover:text-[#EDEFF3] lg:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {mobileOpen ? (
              <path d="M4 4l12 12M16 4L4 16" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" />
            )}
          </svg>
        </button>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="menu-anim absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-[#1B2029] bg-[#0B0E14] shadow-[0_16px_32px_-16px_rgba(0,0,0,0.7)] lg:hidden"
        >
          <div className="mx-auto max-w-6xl px-4 pb-5 pt-4 sm:px-6">
            {/* who's signed in */}
            <div className="flex items-center gap-3">
              <Avatar image={user?.image} fallback={fallback} size="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-[14px] text-[#EDEFF3]">{displayName}</p>
                {user?.email && (
                  <p className="truncate font-mono text-[11px] text-[#565F73]">{user.email}</p>
                )}
              </div>
            </div>

            {/* 16px text stops iOS Safari from zooming the page on focus */}
            <input
              type="text"
              placeholder="Search"
              className="mt-4 w-full rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-2.5 text-[16px] text-[#EDEFF3] placeholder:text-[#565F73] outline-none focus:border-[#34D399]"
            />

            <nav className="mt-4 flex flex-col gap-1 font-mono text-[14px]">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`flex min-h-[44px] items-center rounded-r-[6px] border-l-2 px-3 transition-colors ${
                    isActive(l.href)
                      ? "border-[#34D399] bg-[#12161F] text-[#EDEFF3]"
                      : "border-transparent text-[#8B93A7] hover:bg-[#12161F] hover:text-[#EDEFF3]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="my-4 h-px bg-[#1B2029]" />

            <div className="flex flex-col gap-1 font-mono text-[14px]">
              {accountLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center rounded-[6px] px-3 text-[#8B93A7] transition-colors hover:bg-[#12161F] hover:text-[#EDEFF3]"
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex min-h-[44px] items-center rounded-[6px] px-3 text-left text-[#F2726F] transition-colors hover:bg-[#12161F]"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}