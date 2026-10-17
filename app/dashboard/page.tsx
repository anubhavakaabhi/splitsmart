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

type Group = {
  id: string;
  name: string;
  accent: string;
  members: string[];
  total: number;
  expenseTitle?: string;
  splits: Split[];
  createdAt: Date | null;
  yourShare?: Split;
  settled: boolean;
};

// ---- helpers -------------------------------------------------------------

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

function shortDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}

// `isPaid: true` = that person's share is settled (same meaning as the other pages)
function toGroup(raw: ApiGroup): Group {
  const id = typeof raw._id === "string" ? raw._id : raw._id?.$oid ?? "";
  const splits = raw.splits ?? [];
  return {
    id,
    name: raw.name,
    accent: pickAccent(id || raw.name),
    members: raw.members ?? [],
    total: raw.expenses ?? splits.reduce((sum, s) => sum + (s.amount || 0), 0),
    expenseTitle: raw.expenseTitle,
    splits,
    createdAt: dateFromObjectId(id),
    yourShare: splits.find((s) => s.person === "You"),
    settled: splits.length > 0 && splits.every((s) => s.isPaid),
  };
}

function donutGradient(slices: { value: number; color: string }[]) {
  const sum = slices.reduce((s, x) => s + x.value, 0);
  if (sum === 0) return "conic-gradient(#1B2029 0 100%)";
  let acc = 0;
  const stops = slices.map((s) => {
    const start = acc;
    acc += (s.value / sum) * 100;
    return `${s.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

// ---- page ---------------------------------------------------------------

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/group/getgroups");
      if (!res.ok) throw new Error("Couldn't load your dashboard.");

      const data = await res.json();
      const raw: ApiGroup[] = Array.isArray(data) ? data : data?.groups ?? [];

      setGroups(
        raw
          .map(toGroup)
          .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // ---- derived numbers ----
  const withExpense = groups.filter((g) => g.expenseTitle || g.total > 0);

  const totalSpent = withExpense.reduce((sum, g) => sum + g.total, 0);
  const yourPending = groups.reduce(
    (sum, g) => sum + (g.yourShare && !g.yourShare.isPaid ? g.yourShare.amount : 0),
    0
  );

  const allSplits = groups.flatMap((g) => g.splits);
  const splitTotal = allSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const settledAmount = allSplits
    .filter((s) => s.isPaid)
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const settledPct = splitTotal > 0 ? (settledAmount / splitTotal) * 100 : 0;

  // everyone's unpaid shares across all groups, biggest first
  const pendingSplits = groups
    .flatMap((g) =>
      g.splits
        .filter((s) => !s.isPaid)
        .map((s) => ({ ...s, groupId: g.id, groupName: g.name, accent: g.accent }))
    )
    .sort((a, b) => b.amount - a.amount);

  // "Settle up" jumps to a group where you still owe, else any unsettled one
  const settleTarget =
    groups.find((g) => g.yourShare && !g.yourShare.isPaid) ??
    groups.find((g) => !g.settled && g.splits.length > 0);

  // spending by group → donut (top 4 + "Other")
  const sortedBySpend = [...withExpense].sort((a, b) => b.total - a.total);
  const slices = sortedBySpend.slice(0, 4).map((g) => ({
    label: g.name,
    value: g.total,
    color: g.accent,
  }));
  const rest = sortedBySpend.slice(4).reduce((sum, g) => sum + g.total, 0);
  if (rest > 0) slices.push({ label: "Other", value: rest, color: "#565F73" });
  const sliceSum = slices.reduce((sum, s) => sum + s.value, 0);

  const showContent = !loading && !loadError && groups.length > 0;

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
        .reveal-anim { opacity: 0; animation: reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .skeleton {
          background: linear-gradient(90deg, #1B2029 0%, #232937 50%, #1B2029 100%);
          background-size: 600px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        .bar-fill { transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
          .skeleton { animation: none !important; }
          .bar-fill { transition: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* totals + quick actions */}
        <div
          className="reveal-anim grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "60ms" }}
        >
          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-5">
            <p className="font-mono text-[12px] text-[#8B93A7]">Your pending share</p>
            {loading ? (
              <div className="skeleton mt-3 h-8 w-28 rounded-[4px]" />
            ) : (
              <p
                className={`mt-2 font-mono text-[28px] ${
                  yourPending > 0 ? "text-[#F5B95B]" : "text-[#565F73]"
                }`}
              >
                ${fmt(yourPending)}
              </p>
            )}
            <Link
              href="/dashboard/expenses"
              className="mt-2 inline-block text-[13px] text-[#565F73] transition-colors hover:text-[#EDEFF3]"
            >
              View details →
            </Link>
          </div>

          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-5">
            <p className="font-mono text-[12px] text-[#8B93A7]">Total spent</p>
            {loading ? (
              <div className="skeleton mt-3 h-8 w-28 rounded-[4px]" />
            ) : (
              <p className="mt-2 font-mono text-[28px] text-[#EDEFF3]">${fmt(totalSpent)}</p>
            )}
            <Link
              href="/dashboard/groups"
              className="mt-2 inline-block text-[13px] text-[#565F73] transition-colors hover:text-[#EDEFF3]"
            >
              View groups →
            </Link>
          </div>

          <div className="flex flex-col justify-center gap-2 rounded-[8px] border border-[#232937] bg-[#12161F] p-5 sm:col-span-2">
            <p className="mb-1 font-mono text-[12px] text-[#8B93A7]">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/groups"
                className="rounded-[6px] bg-[#34D399] px-3 py-1.5 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
              >
                + New group
              </Link>
              <Link
                href="/dashboard/expenses"
                className="rounded-[6px] border border-[#232937] px-3 py-1.5 font-mono text-[13px] text-[#EDEFF3] transition-colors hover:border-[#34D399]"
              >
                All expenses
              </Link>
              {settleTarget ? (
                <Link
                  href={`/dashboard/groups/${settleTarget.id}`}
                  className="rounded-[6px] border border-[#232937] px-3 py-1.5 font-mono text-[13px] text-[#EDEFF3] transition-colors hover:border-[#34D399]"
                >
                  Settle up
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-[6px] border border-[#1B2029] px-3 py-1.5 font-mono text-[13px] text-[#565F73]">
                  Settle up
                </span>
              )}
            </div>
          </div>
        </div>

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
        {!loading && !loadError && groups.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="text-[15px]">Nothing here yet</p>
            <p className="max-w-xs text-[13px] text-[#8B93A7]">
              Create a group and add your first expense — your balances and activity will show up here.
            </p>
            <Link
              href="/dashboard/groups"
              className="rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
            >
              + Create your first group
            </Link>
          </div>
        )}

        {/* loading skeletons for the sections below */}
        {loading && (
          <>
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="skeleton h-[104px] rounded-[8px]" />
              ))}
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[0, 1, 2].map((n) => (
                <div key={n} className="skeleton h-72 rounded-[8px]" />
              ))}
            </div>
          </>
        )}

        {showContent && (
          <>
            {/* groups */}
            <div className="reveal-anim mt-10" style={{ animationDelay: "140ms" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-[13px] text-[#8B93A7]">Your groups</h2>
                <Link
                  href="/dashboard/groups"
                  className="font-mono text-[12px] text-[#565F73] transition-colors hover:text-[#EDEFF3]"
                >
                  View all →
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {groups.slice(0, 4).map((g) => {
                  const pending = g.yourShare && !g.yourShare.isPaid;
                  return (
                    <Link
                      key={g.id}
                      href={`/dashboard/groups/${g.id}`}
                      className="relative overflow-hidden rounded-[8px] border border-[#232937] bg-[#12161F] p-4 pl-5 transition-colors hover:border-[#33394A]"
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ backgroundColor: g.accent }}
                      />
                      <p className="truncate text-[14px] font-medium text-[#EDEFF3]">{g.name}</p>
                      <p className="mt-1 text-[12px] text-[#565F73]">
                        {g.members.length} {g.members.length === 1 ? "member" : "members"}
                        {g.createdAt && ` · ${shortDate(g.createdAt)}`}
                      </p>
                      <p className="mt-3 flex items-center gap-1.5 font-mono text-[13px]">
                        {g.yourShare ? (
                          <>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                pending ? "bg-[#F5B95B]" : "bg-[#34D399]"
                              }`}
                            />
                            <span className={pending ? "text-[#EDEFF3]" : "text-[#565F73]"}>
                              {pending ? `$${fmt(g.yourShare.amount)} to settle` : "Settled"}
                            </span>
                          </>
                        ) : (
                          <span className="text-[#565F73]">No share</span>
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* expenses + to-settle + spending */}
            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* recent expenses */}
              <div
                className="reveal-anim rounded-[8px] border border-[#232937] bg-[#12161F] p-5"
                style={{ animationDelay: "220ms" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-[13px] text-[#8B93A7]">Recent expenses</h2>
                  <Link
                    href="/dashboard/expenses"
                    className="font-mono text-[12px] text-[#565F73] transition-colors hover:text-[#EDEFF3]"
                  >
                    View all →
                  </Link>
                </div>

                {withExpense.length === 0 ? (
                  <p className="mt-6 text-[13px] text-[#565F73]">No expenses yet.</p>
                ) : (
                  <div className="mt-4 flex flex-col divide-y divide-[#1B2029]">
                    {withExpense.slice(0, 4).map((g) => (
                      <Link
                        key={g.id}
                        href={`/dashboard/groups/${g.id}`}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] font-mono text-[11px] font-medium text-[#0B0E14]"
                          style={{ backgroundColor: g.accent }}
                        >
                          {initials(g.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-[#EDEFF3]">
                            {g.expenseTitle ?? "Untitled expense"}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-[#565F73]">
                            {g.name}
                            {g.createdAt && ` · ${shortDate(g.createdAt)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[13px]">${fmt(g.total)}</p>
                          <p
                            className={`font-mono text-[10px] ${
                              g.settled ? "text-[#34D399]" : "text-[#F5B95B]"
                            }`}
                          >
                            {g.settled ? "settled" : "pending"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* still to settle */}
              <div
                className="reveal-anim rounded-[8px] border border-[#232937] bg-[#12161F] p-5"
                style={{ animationDelay: "300ms" }}
              >
                <h2 className="font-mono text-[13px] text-[#8B93A7]">Still to settle</h2>

                {pendingSplits.length === 0 ? (
                  <p className="mt-6 text-[13px] text-[#34D399]">Everyone's settled up ✓</p>
                ) : (
                  <>
                    <div className="mt-4 flex flex-col divide-y divide-[#1B2029]">
                      {pendingSplits.slice(0, 5).map((s) => (
                        <Link
                          key={`${s.groupId}-${s.person}`}
                          href={`/dashboard/groups/${s.groupId}`}
                          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#232937] font-mono text-[11px]">
                            {initials(s.person)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-[#EDEFF3]">
                              {s.person}
                              {s.person === "You" && (
                                <span className="ml-1 text-[#565F73]">(you)</span>
                              )}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-[#565F73]">
                              {s.groupName}
                            </p>
                          </div>
                          <p className="font-mono text-[13px] text-[#F5B95B]">${fmt(s.amount)}</p>
                        </Link>
                      ))}
                    </div>

                    <p className="mt-4 font-mono text-[11px] text-[#565F73]">
                      {pendingSplits.length} pending{" "}
                      {pendingSplits.length === 1 ? "share" : "shares"} in total
                    </p>
                  </>
                )}
              </div>

              {/* spending by group + settlement progress */}
              <div
                className="reveal-anim rounded-[8px] border border-[#232937] bg-[#12161F] p-5"
                style={{ animationDelay: "380ms" }}
              >
                <h2 className="font-mono text-[13px] text-[#8B93A7]">Spending by group</h2>

                {slices.length === 0 ? (
                  <p className="mt-6 text-[13px] text-[#565F73]">No spending yet.</p>
                ) : (
                  <div className="mt-4 flex items-center gap-5">
                    <div
                      className="h-20 w-20 shrink-0 rounded-full"
                      style={{
                        background: donutGradient(slices),
                        WebkitMask: "radial-gradient(farthest-side, transparent 62%, #000 63%)",
                        mask: "radial-gradient(farthest-side, transparent 62%, #000 63%)",
                      }}
                    />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      {slices.map((s) => (
                        <div
                          key={s.label}
                          className="flex items-center gap-2 text-[12px] text-[#8B93A7]"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="truncate">{s.label}</span>
                          <span className="shrink-0 text-[#565F73]">
                            {Math.round((s.value / sliceSum) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className="mt-6 font-mono text-[12px] text-[#565F73]">Settled so far</h3>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1B2029]">
                  <div
                    className="bar-fill h-full rounded-full bg-[#34D399]"
                    style={{ width: `${settledPct}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-[11px] text-[#565F73]">
                  ${fmt(settledAmount)} of ${fmt(splitTotal)} · {Math.round(settledPct)}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}