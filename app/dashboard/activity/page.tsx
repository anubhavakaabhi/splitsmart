"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// ---- types ---------------------------------------------------------------

type Split = { person: string; amount: number; isPaid: boolean };

// document shape from /api/group/getgroups (MongoDB)
type ApiGroup = {
  _id: string | { $oid: string };
  name: string;
  members?: string[];
  expenses?: number;
  expenseTitle?: string;
  splitType?: "equally" | "custom";
  splits?: Split[];
  admin?: string;
};

type ActivityType = "group" | "expense" | "payment";

type Activity = {
  key: string;
  type: ActivityType;
  actor: string;
  verb: string;
  object?: string;
  detail?: string;
  amount?: number;
  groupId: string;
  groupName: string;
  accent: string;
  date: Date | null; // used to place the event in the timeline
  timeKnown: boolean; // false → no timestamp stored for this event
};

// ---- helpers -------------------------------------------------------------

const tabs = ["All", "Expenses", "Payments", "Groups"] as const;
const tabType: Record<(typeof tabs)[number], ActivityType | null> = {
  All: null,
  Expenses: "expense",
  Payments: "payment",
  Groups: "group",
};

const accentPalette = ["#5B8DEF", "#F5B95B", "#B084F0", "#34D399", "#F2726F"];

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// same group → same color on every page
function pickAccent(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return accentPalette[h % accentPalette.length];
}

// first 4 bytes of a Mongo ObjectId = creation time (unix seconds)
function dateFromObjectId(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

function dayLabel(d: Date | null) {
  if (!d) return "Earlier";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
  });
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function summarizeNames(names: string[]) {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
}

// The group's admin is stored as an email. Show "You" if that's the signed-in
// user, otherwise the part before the @.
function actorName(admin: string | undefined, me: string | null | undefined) {
  if (!admin) return "Someone";
  if (me && admin.toLowerCase() === me.toLowerCase()) return "You";
  return admin.split("@")[0];
}

// There is no activity collection, so the feed is derived from each group
// document. Returned newest-first.
function buildEvents(raw: ApiGroup, me: string | null | undefined): Activity[] {
  const id = typeof raw._id === "string" ? raw._id : raw._id?.$oid ?? "";
  const date = dateFromObjectId(id);
  const accent = pickAccent(id || raw.name);
  const actor = actorName(raw.admin, me);
  const members = raw.members ?? [];
  const splits = raw.splits ?? [];

  const base = { groupId: id, groupName: raw.name, accent, date };
  const out: Activity[] = []; // built oldest → newest, reversed at the end

  out.push({
    ...base,
    key: `${id}-created`,
    type: "group",
    actor,
    verb: "created the group",
    object: raw.name,
    timeKnown: !!date,
  });

  if (members.length > 0) {
    out.push({
      ...base,
      key: `${id}-members`,
      type: "group",
      actor,
      verb: "added",
      object: `${members.length} ${members.length === 1 ? "member" : "members"}`,
      detail: summarizeNames(members),
      timeKnown: !!date,
    });
  }

  if (raw.expenseTitle || (raw.expenses ?? 0) > 0) {
    const split =
      raw.splitType === "custom" ? "custom split" : raw.splitType === "equally" ? "equal split" : "";
    out.push({
      ...base,
      key: `${id}-expense`,
      type: "expense",
      actor,
      verb: "added the expense",
      object: raw.expenseTitle || "Untitled expense",
      detail: [split, splits.length ? `${splits.length} people` : ""].filter(Boolean).join(" · "),
      amount: raw.expenses ?? splits.reduce((sum, s) => sum + (s.amount || 0), 0),
      timeKnown: !!date,
    });
  }

  // `isPaid: true` = that person's share is settled. Settlements have no
  // timestamp in the data, so they're slotted in after the expense and
  // labelled "date not recorded".
  splits
    .filter((s) => s.isPaid)
    .forEach((s) => {
      out.push({
        ...base,
        key: `${id}-paid-${s.person}`,
        type: "payment",
        actor: s.person,
        verb: s.person === "You" ? "paid your share" : "paid their share",
        amount: s.amount,
        timeKnown: false,
      });
    });

  return out.reverse();
}

// ---- page ---------------------------------------------------------------

export default function ActivityPage() {
  const { data: session } = useSession();
  const me = session?.user?.email;

  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");

  const fetchGroups = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/group/getgroups");
      if (!res.ok) throw new Error("Couldn't load your activity.");

      const data = await res.json();
      setGroups(Array.isArray(data) ? data : data?.groups ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // newest group first; each group's events are already newest-first
  const events = useMemo(() => {
    const sorted = [...groups].sort((a, b) => {
      const ida = typeof a._id === "string" ? a._id : a._id?.$oid ?? "";
      const idb = typeof b._id === "string" ? b._id : b._id?.$oid ?? "";
      return (dateFromObjectId(idb)?.getTime() ?? 0) - (dateFromObjectId(ida)?.getTime() ?? 0);
    });
    return sorted.flatMap((g) => buildEvents(g, me));
  }, [groups, me]);

  const wanted = tabType[tab];
  const filtered = wanted ? events.filter((e) => e.type === wanted) : events;

  // bucket into day sections, preserving order
  const sections: { label: string; items: Activity[] }[] = [];
  filtered.forEach((e) => {
    const label = dayLabel(e.date);
    const last = sections[sections.length - 1];
    if (last && last.label === label) last.items.push(e);
    else sections.push({ label, items: [e] });
  });

  const showFeed = !loading && !loadError && events.length > 0;
  let rowIndex = 0; // running index so the reveal stagger continues across sections

  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3]`}
    >
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -300px 0; }
          100% { background-position: 300px 0; }
        }
        .reveal-anim { opacity: 0; animation: reveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .skeleton {
          background: linear-gradient(90deg, #1B2029 0%, #232937 50%, #1B2029 100%);
          background-size: 600px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
          .skeleton { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* header */}
        <div className="reveal-anim" style={{ animationDelay: "40ms" }}>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">Activity</h1>
          <p className="mt-1 text-[13px] text-[#8B93A7]">
            {loading
              ? "Loading your activity…"
              : `${events.length} ${events.length === 1 ? "event" : "events"} across ${
                  groups.length
                } ${groups.length === 1 ? "group" : "groups"}`}
          </p>
        </div>

        {/* filters */}
        <div className="reveal-anim mt-6" style={{ animationDelay: "100ms" }}>
          <div className="inline-flex items-center gap-1 rounded-[6px] border border-[#232937] bg-[#12161F] p-1 font-mono text-[12px]">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-[4px] px-3 py-1.5 transition-colors ${
                  tab === t
                    ? "bg-[#232937] text-[#EDEFF3]"
                    : "text-[#8B93A7] hover:text-[#EDEFF3]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* loading */}
        {loading && (
          <div className="mt-8 flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton h-[68px] rounded-[10px]" />
            ))}
          </div>
        )}

        {/* error */}
        {!loading && loadError && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="text-[14px] text-[#F2726F]">{loadError}</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchGroups();
              }}
              className="rounded-[6px] border border-[#232937] px-4 py-2 font-mono text-[13px] transition-colors hover:border-[#34D399]"
            >
              Try again
            </button>
          </div>
        )}

        {/* empty */}
        {!loading && !loadError && events.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="text-[15px]">No activity yet</p>
            <p className="max-w-xs text-[13px] text-[#8B93A7]">
              Groups, expenses, and payments will show up here as they happen.
            </p>
            <Link
              href="/dashboard/groups"
              className="rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
            >
              Go to groups
            </Link>
          </div>
        )}

        {/* feed */}
        {showFeed &&
          sections.map((section) => (
            <section key={section.label} className="mt-8">
              <h2 className="font-mono text-[12px] text-[#565F73]">{section.label}</h2>

              <div className="mt-3 divide-y divide-[#1B2029] overflow-hidden rounded-[10px] border border-[#232937] bg-[#12161F]">
                {section.items.map((e) => {
                  const delay = 160 + Math.min(rowIndex++, 10) * 40;
                  return (
                    <Link
                      key={e.key}
                      href={`/dashboard/groups/${e.groupId}`}
                      className="reveal-anim flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#161B26]"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#232937] font-mono text-[12px]">
                        {initials(e.actor)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug">
                          <span className="font-medium text-[#EDEFF3]">{e.actor}</span>{" "}
                          <span className="text-[#8B93A7]">{e.verb}</span>
                          {e.object && (
                            <>
                              {" "}
                              <span className="font-medium text-[#EDEFF3]">{e.object}</span>
                            </>
                          )}
                        </p>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[#565F73]">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: e.accent }}
                          />
                          <span className="truncate">
                            {e.groupName}
                            {e.detail && ` · ${e.detail}`}
                            {" · "}
                            {e.timeKnown && e.date ? timeLabel(e.date) : "date not recorded"}
                          </span>
                        </p>
                      </div>

                      {e.amount !== undefined && (
                        <p
                          className={`shrink-0 font-mono text-[14px] ${
                            e.type === "payment" ? "text-[#34D399]" : "text-[#EDEFF3]"
                          }`}
                        >
                          ${fmt(e.amount)}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

        {/* tab matched nothing */}
        {showFeed && filtered.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-[#565F73]">
            Nothing in this category yet.
          </p>
        )}
      </div>
    </main>
  );
}