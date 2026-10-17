"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

// one row in the ledger — each group document carries one expense
type Expense = {
  groupId: string;
  title: string;
  groupName: string;
  accent: string;
  total: number;
  splitType?: "equally" | "custom";
  splits: Split[];
  createdAt: Date | null;
  yourShare?: Split;
  settledCount: number;
  settled: boolean;
};

// ---- helpers -------------------------------------------------------------

const tabs = ["All", "Pending", "Settled"] as const;
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

// same group → same color everywhere (matches the groups page)
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

function toExpense(raw: ApiGroup): Expense {
  const groupId = typeof raw._id === "string" ? raw._id : raw._id?.$oid ?? "";
  const splits = raw.splits ?? [];
  const settledCount = splits.filter((s) => s.isPaid).length;

  return {
    groupId,
    title: raw.expenseTitle || "Untitled expense",
    groupName: raw.name,
    accent: pickAccent(groupId || raw.name),
    total: raw.expenses ?? splits.reduce((sum, s) => sum + (s.amount || 0), 0),
    splitType: raw.splitType,
    splits,
    createdAt: dateFromObjectId(groupId),
    yourShare: splits.find((s) => s.person === "You"),
    settledCount,
    settled: splits.length > 0 && settledCount === splits.length,
  };
}

function monthKey(d: Date | null) {
  return d
    ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Undated";
}

// ---- page ---------------------------------------------------------------

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");

  const fetchExpenses = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/group/getgroups");
      if (!res.ok) throw new Error("Couldn't load your expenses.");

      const data = await res.json();
      const raw: ApiGroup[] = Array.isArray(data) ? data : data?.groups ?? [];

      const mapped = raw
        // groups created without a first expense have nothing to list
        .filter((g) => g.expenseTitle || (g.expenses ?? 0) > 0)
        .map(toExpense)
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

      setExpenses(mapped);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // summary numbers (over everything, not just the filtered view)
  const totalSpent = expenses.reduce((sum, e) => sum + e.total, 0);
  const yourPending = expenses.reduce(
    (sum, e) => sum + (e.yourShare && !e.yourShare.isPaid ? e.yourShare.amount : 0),
    0
  );
  const openCount = expenses.filter((e) => !e.settled).length;

  const filtered = expenses.filter((e) => {
    const q = query.toLowerCase();
    if (q && !e.title.toLowerCase().includes(q) && !e.groupName.toLowerCase().includes(q)) {
      return false;
    }
    if (tab === "Pending") return !e.settled;
    if (tab === "Settled") return e.settled;
    return true;
  });

  // group rows under month headings, keeping newest-first order
  const byMonth = new Map<string, Expense[]>();
  filtered.forEach((e) => {
    const key = monthKey(e.createdAt);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  });

  const showList = !loading && !loadError && expenses.length > 0;
  let rowIndex = 0; // running index so the reveal stagger continues across months

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

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* header */}
        <div className="reveal-anim" style={{ animationDelay: "40ms" }}>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">Expenses</h1>
          <p className="mt-1 text-[13px] text-[#8B93A7]">
            {loading
              ? "Loading your expenses…"
              : `${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"} across your groups`}
          </p>
        </div>

        {/* summary */}
        <div
          className="reveal-anim mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
          style={{ animationDelay: "100ms" }}
        >
          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4">
            <p className="font-mono text-[11px] text-[#8B93A7]">Total spent</p>
            {loading ? (
              <div className="skeleton mt-2 h-6 w-24 rounded-[4px]" />
            ) : (
              <p className="mt-1.5 font-mono text-[20px] text-[#EDEFF3]">₹{fmt(totalSpent)}</p>
            )}
          </div>
          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4">
            <p className="font-mono text-[11px] text-[#8B93A7]">Your pending share</p>
            {loading ? (
              <div className="skeleton mt-2 h-6 w-24 rounded-[4px]" />
            ) : (
              <p
                className={`mt-1.5 font-mono text-[20px] ${
                  yourPending > 0 ? "text-[#F5B95B]" : "text-[#565F73]"
                }`}
              >
                ₹{fmt(yourPending)}
              </p>
            )}
          </div>
          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4">
            <p className="font-mono text-[11px] text-[#8B93A7]">Open expenses</p>
            {loading ? (
              <div className="skeleton mt-2 h-6 w-12 rounded-[4px]" />
            ) : (
              <p className="mt-1.5 font-mono text-[20px] text-[#EDEFF3]">{openCount}</p>
            )}
          </div>
        </div>

        {/* filters */}
        <div
          className="reveal-anim mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: "160ms" }}
        >
          <div className="flex items-center gap-1 rounded-[6px] border border-[#232937] bg-[#12161F] p-1 font-mono text-[12px]">
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

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses or groups"
            className="w-full rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-2 text-[13px] text-[#EDEFF3] placeholder:text-[#565F73] outline-none focus:border-[#34D399] sm:w-64"
          />
        </div>

        {/* loading */}
        {loading && (
          <div className="mt-8 flex flex-col gap-3">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="skeleton h-[76px] rounded-[10px]" />
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
                fetchExpenses();
              }}
              className="rounded-[6px] border border-[#232937] px-4 py-2 font-mono text-[13px] transition-colors hover:border-[#34D399]"
            >
              Try again
            </button>
          </div>
        )}

        {/* empty */}
        {!loading && !loadError && expenses.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="text-[15px]">No expenses yet</p>
            <p className="max-w-xs text-[13px] text-[#8B93A7]">
              Expenses show up here once you add one while creating a group.
            </p>
            <Link
              href="/dashboard/groups"
              className="rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
            >
              Go to groups
            </Link>
          </div>
        )}

        {/* ledger */}
        {showList &&
          Array.from(byMonth.entries()).map(([month, rows]) => (
            <section key={month} className="mt-8">
              <h2 className="font-mono text-[12px] text-[#565F73]">{month}</h2>

              <div className="mt-3 flex flex-col gap-3">
                {rows.map((e) => {
                  const delay = 200 + Math.min(rowIndex++, 8) * 50;
                  const yourPendingRow = e.yourShare && !e.yourShare.isPaid;

                  return (
                    <Link
                      key={e.groupId}
                      href={`/dashboard/groups/${e.groupId}`}
                      className="reveal-anim group relative flex items-center gap-4 overflow-hidden rounded-[10px] border border-[#232937] bg-[#12161F] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#33394A]"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ backgroundColor: e.accent }}
                      />

                      <span
                        className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] font-mono text-[12px] font-medium text-[#0B0E14]"
                        style={{ backgroundColor: e.accent }}
                      >
                        {initials(e.groupName)}
                      </span>

                      {/* title + group */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{e.title}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[#565F73]">
                          {e.groupName}
                          {e.createdAt &&
                            ` · ${e.createdAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}`}
                          {e.splitType &&
                            ` · ${e.splitType === "equally" ? "equal split" : "custom split"}`}
                        </p>
                      </div>

                      {/* your share (hidden on very small screens) */}
                      <div className="hidden text-right sm:block">
                        <p className="font-mono text-[10px] uppercase tracking-wide text-[#565F73]">
                          Your share
                        </p>
                        {e.yourShare ? (
                          <p className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-[13px]">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                yourPendingRow ? "bg-[#F5B95B]" : "bg-[#34D399]"
                              }`}
                            />
                            <span className={yourPendingRow ? "text-[#EDEFF3]" : "text-[#565F73]"}>
                              ₹{fmt(e.yourShare.amount)}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-0.5 font-mono text-[13px] text-[#565F73]">—</p>
                        )}
                      </div>

                      {/* total + progress */}
                      <div className="text-right">
                        <p className="font-mono text-[15px]">₹{fmt(e.total)}</p>
                        <p
                          className={`mt-0.5 font-mono text-[11px] ${
                            e.settled ? "text-[#34D399]" : "text-[#F5B95B]"
                          }`}
                        >
                          {e.settled
                            ? "✓ settled"
                            : `${e.settledCount}/${e.splits.length} settled`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

        {/* filters matched nothing */}
        {showList && filtered.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-[#565F73]">
            No expenses match that filter.
          </p>
        )}
      </div>
    </main>
  );
}