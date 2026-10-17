"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// ---- types ---------------------------------------------------------------

type Split = { person: string; amount: number; isPaid: boolean };

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
  members: string[];
  total: number;
  expenseTitle?: string;
  splitType?: "equally" | "custom";
  splits: Split[];
  admin?: string;
  createdAt: Date | null;
};

// ---- helpers -------------------------------------------------------------

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

// first 4 bytes of a Mongo ObjectId = creation time (unix seconds)
function dateFromObjectId(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

function toGroup(raw: ApiGroup): Group {
  const id = typeof raw._id === "string" ? raw._id : raw._id?.$oid ?? "";
  const splits = raw.splits ?? [];
  return {
    id,
    name: raw.name,
    members: raw.members ?? [],
    total: raw.expenses ?? splits.reduce((s, x) => s + (x.amount || 0), 0),
    expenseTitle: raw.expenseTitle,
    splitType: raw.splitType,
    splits,
    admin: raw.admin,
    createdAt: dateFromObjectId(id),
  };
}

// ---- page ---------------------------------------------------------------

export default function GroupDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [confirming, setConfirming] = useState<string | null>(null); // person awaiting confirm
  const [settling, setSettling] = useState<string | null>(null); // person being saved
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    setLoadError(null);
    setNotFound(false);
    try {
      // Uses your existing list endpoint and picks this group out of it.
      // If you add a GET /api/group/[id] route later, swap it in here.
      const res = await fetch("/api/group/getgroups");
      if (!res.ok) throw new Error("Couldn't load this group.");

      const data = await res.json();
      const raw: ApiGroup[] = Array.isArray(data) ? data : data?.groups ?? [];
      const match = raw.map(toGroup).find((g) => g.id === id);

      if (!match) setNotFound(true);
      else setGroup(match);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  async function settle(person: string) {
    setConfirming(null);
    setSettling(person);
    setActionError(null);

    // optimistic: flip isPaid right away, roll back if the request fails
    setGroup((g) =>
      g
        ? { ...g, splits: g.splits.map((s) => (s.person === person ? { ...s, isPaid: true } : s)) }
        : g
    );

    try {
      const res = await fetch("/api/group/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: id, person }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Couldn't mark that as settled. Try again.");
      }
    } catch (err) {
      setGroup((g) =>
        g
          ? { ...g, splits: g.splits.map((s) => (s.person === person ? { ...s, isPaid: false } : s)) }
          : g
      );
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSettling(null);
    }
  }

  const paidAmount = group
    ? group.splits.filter((s) => s.isPaid).reduce((sum, s) => sum + (s.amount || 0), 0)
    : 0;
  const outstanding = group ? Math.max(group.total - paidAmount, 0) : 0;
  const pct = group && group.total > 0 ? Math.min((paidAmount / group.total) * 100, 100) : 0;
  const pendingCount = group ? group.splits.filter((s) => !s.isPaid).length : 0;
  const allSettled = !!group && group.splits.length > 0 && pendingCount === 0;

  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3]`}
    >
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(10px); }
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/dashboard/groups"
          className="reveal-anim inline-block font-mono text-[13px] text-[#8B93A7] transition-colors hover:text-[#EDEFF3]"
          style={{ animationDelay: "20ms" }}
        >
          ← Groups
        </Link>

        {/* loading */}
        {loading && (
          <div className="mt-6">
            <div className="skeleton h-7 w-56 rounded-[4px]" />
            <div className="skeleton mt-3 h-4 w-40 rounded-[4px]" />
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((n) => (
                <div key={n} className="skeleton h-20 rounded-[8px]" />
              ))}
            </div>
            <div className="skeleton mt-6 h-64 rounded-[10px]" />
          </div>
        )}

        {/* error */}
        {!loading && loadError && (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <p className="text-[14px] text-[#F2726F]">{loadError}</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchGroup();
              }}
              className="rounded-[6px] border border-[#232937] px-4 py-2 font-mono text-[13px] transition-colors hover:border-[#34D399]"
            >
              Try again
            </button>
          </div>
        )}

        {/* not found */}
        {!loading && notFound && (
          <div className="mt-20 flex flex-col items-center gap-3 text-center">
            <p className="text-[16px]">Group not found</p>
            <p className="max-w-xs text-[13px] text-[#8B93A7]">
              It may have been deleted, or you may not be a member of it.
            </p>
          </div>
        )}

        {/* loaded */}
        {!loading && group && (
          <>
            {/* title */}
            <div className="reveal-anim mt-6" style={{ animationDelay: "60ms" }}>
              <h1 className="text-[26px] font-medium tracking-[-0.01em]">{group.name}</h1>
              <p className="mt-1.5 font-mono text-[12px] text-[#565F73]">
                {group.members.length} {group.members.length === 1 ? "member" : "members"}
                {group.createdAt &&
                  ` · created ${group.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`}
              </p>
            </div>

            {/* summary */}
            <div
              className="reveal-anim mt-8 grid grid-cols-3 gap-3"
              style={{ animationDelay: "120ms" }}
            >
              <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4">
                <p className="font-mono text-[11px] text-[#8B93A7]">Total</p>
                <p className="mt-1.5 font-mono text-[18px] text-[#EDEFF3]">${fmt(group.total)}</p>
              </div>
              <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4">
                <p className="font-mono text-[11px] text-[#8B93A7]">Settled</p>
                <p className="mt-1.5 font-mono text-[18px] text-[#34D399]">${fmt(paidAmount)}</p>
              </div>
              <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4">
                <p className="font-mono text-[11px] text-[#8B93A7]">Outstanding</p>
                <p
                  className={`mt-1.5 font-mono text-[18px] ${
                    outstanding === 0 ? "text-[#565F73]" : "text-[#F5B95B]"
                  }`}
                >
                  ${fmt(outstanding)}
                </p>
              </div>
            </div>

            {/* progress */}
            <div className="reveal-anim mt-4" style={{ animationDelay: "160ms" }}>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1B2029]">
                <div
                  className="bar-fill h-full rounded-full bg-[#34D399]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] text-[#565F73]">
                {allSettled
                  ? "Everyone's settled up"
                  : `${pendingCount} ${pendingCount === 1 ? "person" : "people"} still to settle`}
              </p>
            </div>

            {/* expense + splits */}
            <div
              className="reveal-anim mt-8 rounded-[10px] border border-[#232937] bg-[#12161F]"
              style={{ animationDelay: "220ms" }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#1B2029] px-5 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-[#565F73]">Expense</p>
                  <p className="mt-0.5 truncate text-[15px] font-medium">
                    {group.expenseTitle ?? "No expense added yet"}
                  </p>
                </div>
                {group.splitType && (
                  <span className="shrink-0 rounded-[4px] bg-[#0B0E14] px-2 py-1 font-mono text-[11px] text-[#8B93A7]">
                    {group.splitType === "equally" ? "equal split" : "custom split"}
                  </span>
                )}
              </div>

              {group.splits.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-[#565F73]">
                  Nothing to settle yet.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-[#1B2029] px-5">
                  {group.splits.map((s) => {
                    const isYou = s.person === "You";
                    const isConfirming = confirming === s.person;
                    const isSaving = settling === s.person;

                    return (
                      <div key={s.person} className="flex items-center gap-3 py-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#232937] font-mono text-[12px]">
                          {initials(s.person)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px]">
                            {s.person}
                            {isYou && <span className="ml-1.5 text-[12px] text-[#565F73]">(you)</span>}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[#565F73]">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                s.isPaid ? "bg-[#34D399]" : "bg-[#F5B95B]"
                              }`}
                            />
                            {s.isPaid ? "Paid" : "Pending"}
                          </p>
                        </div>

                        <p
                          className={`font-mono text-[14px] ${
                            s.isPaid ? "text-[#565F73] line-through decoration-[#565F73]/60" : "text-[#EDEFF3]"
                          }`}
                        >
                          ${fmt(s.amount)}
                        </p>

                        <div className="flex w-[132px] justify-end">
                          {s.isPaid ? (
                            <span className="font-mono text-[12px] text-[#34D399]">✓ Settled</span>
                          ) : isConfirming ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => settle(s.person)}
                                className="rounded-[6px] bg-[#34D399] px-3 py-1.5 font-mono text-[12px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirming(null)}
                                aria-label="Cancel"
                                className="text-[#565F73] transition-colors hover:text-[#EDEFF3]"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActionError(null);
                                setConfirming(s.person);
                              }}
                              disabled={isSaving}
                              className="rounded-[6px] border border-[#232937] px-3 py-1.5 font-mono text-[12px] text-[#EDEFF3] transition-colors hover:border-[#34D399] hover:text-[#34D399] disabled:opacity-50"
                            >
                              {isSaving ? "Saving…" : "Settle"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {actionError && (
              <p className="mt-4 rounded-[6px] border border-[#F2726F]/30 bg-[#F2726F]/10 px-3 py-2 text-[13px] text-[#F2726F]">
                {actionError}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}