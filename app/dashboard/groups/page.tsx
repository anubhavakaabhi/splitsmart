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

// Shape of a document coming back from /api/group/getgroups (MongoDB)
type ApiSplit = { person: string; amount: number; isPaid: boolean };

type ApiGroup = {
  _id: string | { $oid: string };
  name: string;
  members?: string[];
  expenses?: number;
  expenseTitle?: string;
  splitType?: "equally" | "custom";
  splits?: ApiSplit[];
  admin?: string;
};

// Where the signed-in user stands in a group:
//  empty    → the group has no expense / splits yet
//  outside  → there are splits, but none of them is you
//  owe      → your share is still unpaid
//  settled  → your share is paid
type MyStatus = "empty" | "outside" | "owe" | "settled";

// Shape the UI actually renders
type Group = {
  id: string;
  name: string;
  accent: string;
  members: string[];
  createdAt: Date | null;
  totalSpend: number;
  status: MyStatus;
  myShare: number;
  expenseTitle?: string;
  splitType?: "equally" | "custom";
};

// ---- helpers -------------------------------------------------------------

const tabs = ["All", "You owe", "Settled"] as const;
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

// Stable color per group (same group → same color on every load)
function pickAccent(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return accentPalette[h % accentPalette.length];
}

// The first 4 bytes of a Mongo ObjectId are its creation time (unix seconds).
// Your documents have no createdAt field, so we read the date from the _id.
function dateFromObjectId(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

// You can appear in a split as "You" (what the create-group form writes) or
// under your own username — treat both as you, ignoring case.
function makeIsMe(username?: string | null) {
  const u = username?.trim().toLowerCase();
  return (person: string) => {
    const p = person.trim().toLowerCase();
    return p === "you" || (!!u && p === u);
  };
}

// `isPaid: true` = that person's share is settled.
function toGroup(raw: ApiGroup, isMe: (person: string) => boolean): Group {
  const id = typeof raw._id === "string" ? raw._id : raw._id?.$oid ?? "";
  const splits = raw.splits ?? [];

  const mine = splits.filter((s) => isMe(s.person));
  const unpaid = mine.filter((s) => !s.isPaid);

  let status: MyStatus;
  if (splits.length === 0) status = "empty";
  else if (mine.length === 0) status = "outside";
  else if (unpaid.length > 0) status = "owe";
  else status = "settled";

  const myShare = (status === "owe" ? unpaid : mine).reduce(
    (sum, s) => sum + (s.amount || 0),
    0
  );

  return {
    id,
    name: raw.name,
    accent: pickAccent(id || raw.name),
    members: raw.members ?? [],
    createdAt: dateFromObjectId(id),
    totalSpend: raw.expenses ?? 0,
    status,
    myShare,
    expenseTitle: raw.expenseTitle,
    splitType: raw.splitType,
  };
}

// what the bottom-right corner of a card says about you
function statusView(g: Group) {
  switch (g.status) {
    case "owe":
      return { label: "You owe", value: `₹${fmt(g.myShare)}`, color: "text-[#F2726F]" };
    case "settled":
      return { label: "Your share · paid", value: `₹${fmt(g.myShare)}`, color: "text-[#565F73]" };
    case "outside":
      return { label: "Not in split", value: "—", color: "text-[#565F73]" };
    default:
      return { label: "No expenses yet", value: "—", color: "text-[#565F73]" };
  }
}

// ---- create group + expense modal ----------------------------------------

function CreateGroupModal({
  open,
  myUsername,
  onClose,
  onCreated,
}: {
  open: boolean;
  myUsername?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidBy, setPaidBy] = useState("You");
  const [splitType, setSplitType] = useState<"equally" | "custom">("equally");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // lock background scroll while open, close on Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isMe = makeIsMe(myUsername);
  const cleanMembers = members.map((m) => m.trim()).filter(Boolean);
  // "You" already stands for the signed-in user, so if they also typed their own
  // username as a member, don't give them a second row in the split.
  const otherMembers = cleanMembers.filter((m) => !isMe(m));
  const splitPeople = ["You", ...otherMembers];
  const canSubmit = groupName.trim().length > 0 && !submitting;

  const amountValue = parseFloat(expenseAmount) || 0;
  const customTotal = splitPeople.reduce(
    (sum, p) => sum + (parseFloat(customAmounts[p]) || 0),
    0
  );
  const customRemaining = Math.round((amountValue - customTotal) * 100) / 100;

  function updateMember(i: number, value: string) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? value : m)));
  }

  function addMemberField() {
    setMembers((prev) => [...prev, ""]);
  }

  function removeMemberField(i: number) {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCustomAmount(person: string, value: string) {
    setCustomAmounts((prev) => ({ ...prev, [person]: value }));
  }

  function splitEvenlyAcrossEveryone() {
    if (splitPeople.length === 0) return;
    const share = (Math.round((amountValue / splitPeople.length) * 100) / 100).toFixed(2);
    const next: Record<string, string> = {};
    splitPeople.forEach((p) => (next[p] = share));
    setCustomAmounts(next);
  }

  function reset() {
    setGroupName("");
    setMembers([""]);
    setExpenseTitle("");
    setExpenseAmount("");
    setPaidBy("You");
    setSplitType("equally");
    setCustomAmounts({});
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      name: groupName.trim(),
      members: cleanMembers,
      expense: expenseTitle.trim()
        ? {
            title: expenseTitle.trim(),
            amount: amountValue,
            paidBy,
            splitType,
            splits:
              splitType === "custom"
                ? splitPeople.map((p) => ({
                    person: p,
                    amount: parseFloat(customAmounts[p]) || 0,
                  }))
                : null,
          }
        : null,
    };

    try {
      const res = await fetch("/api/group/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Couldn't create the group. Try again.");
      }

      reset();
      onClose();
      onCreated(); // parent re-fetches the real list from MongoDB
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <style>{`
        @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes drop-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .backdrop-anim { animation: backdrop-in 0.2s ease-out both; }
        .panel-anim { animation: panel-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .drop-anim { animation: drop-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .backdrop-anim, .panel-anim, .drop-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* backdrop */}
      <div
        className="backdrop-anim absolute inset-0 bg-[#05070B]/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        className="panel-anim relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[10px] border border-[#232937] bg-[#12161F] p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between">
          <h2 id="create-group-title" className="text-[18px] font-medium tracking-[-0.01em]">
            Create a group
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#565F73] transition-colors hover:text-[#EDEFF3]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
          {/* group name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-name" className="font-mono text-[12px] text-[#8B93A7]">
              Group name
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Goa Trip"
              className="rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 py-2.5 text-[14px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] focus:border-[#34D399]"
            />
          </div>

          {/* members */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[12px] text-[#8B93A7]">Members</label>
            <div className="flex flex-col gap-2">
              {members.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={m}
                    onChange={(e) => updateMember(i, e.target.value)}
                    placeholder="Username"
                    className="flex-1 rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 py-2 text-[13px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] focus:border-[#34D399]"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberField(i)}
                      aria-label="Remove member"
                      className="text-[#565F73] transition-colors hover:text-[#F2726F]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMemberField}
              className="mt-1 self-start font-mono text-[12px] text-[#8B93A7] transition-colors hover:text-[#34D399]"
            >
              + Add member
            </button>
          </div>

          {/* divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#232937]" />
            <span className="font-mono text-[11px] text-[#565F73]">
              first expense (optional)
            </span>
            <div className="h-px flex-1 bg-[#232937]" />
          </div>

          {/* expense */}
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="What was it for? e.g. Flight tickets"
              className="rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 py-2.5 text-[14px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] focus:border-[#34D399]"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 focus-within:border-[#34D399]">
                <span className="font-mono text-[13px] text-[#565F73]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent py-2.5 pl-1.5 text-[14px] text-[#EDEFF3] outline-none placeholder:text-[#565F73]"
                />
              </div>

              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 py-2.5 text-[13px] text-[#EDEFF3] outline-none focus:border-[#34D399]"
              >
                <option value="You">Paid by You</option>
                {otherMembers.map((m, i) => (
                  <option key={i} value={m}>
                    Paid by {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 rounded-[6px] border border-[#232937] bg-[#0B0E14] p-1 font-mono text-[12px]">
              <button
                type="button"
                onClick={() => setSplitType("equally")}
                className={`flex-1 rounded-[4px] py-1.5 transition-colors ${
                  splitType === "equally"
                    ? "bg-[#232937] text-[#EDEFF3]"
                    : "text-[#8B93A7] hover:text-[#EDEFF3]"
                }`}
              >
                Split equally
              </button>
              <button
                type="button"
                onClick={() => setSplitType("custom")}
                className={`flex-1 rounded-[4px] py-1.5 transition-colors ${
                  splitType === "custom"
                    ? "bg-[#232937] text-[#EDEFF3]"
                    : "text-[#8B93A7] hover:text-[#EDEFF3]"
                }`}
              >
                Split custom
              </button>
            </div>

            {/* custom split dropdown: one row per person typed above, each with their own amount */}
            {splitType === "custom" && (
              <div className="drop-anim rounded-[8px] border border-[#232937] bg-[#0B0E14] p-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] text-[#565F73]">
                    Split between {splitPeople.length}{" "}
                    {splitPeople.length === 1 ? "person" : "people"}
                  </p>
                  <button
                    type="button"
                    onClick={splitEvenlyAcrossEveryone}
                    className="font-mono text-[11px] text-[#8B93A7] transition-colors hover:text-[#34D399]"
                  >
                    Split evenly
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {splitPeople.map((person) => (
                    <div key={person} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#232937] font-mono text-[10px] text-[#EDEFF3]">
                        {initials(person)}
                      </span>
                      <span className="flex-1 truncate text-[13px] text-[#EDEFF3]">
                        {person}
                      </span>
                      <div className="flex items-center rounded-[6px] border border-[#232937] bg-[#12161F] px-2 focus-within:border-[#34D399]">
                        <span className="font-mono text-[12px] text-[#565F73]">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customAmounts[person] ?? ""}
                          onChange={(e) => updateCustomAmount(person, e.target.value)}
                          placeholder="0.00"
                          className="w-20 bg-transparent py-1.5 pl-1 text-right text-[13px] text-[#EDEFF3] outline-none placeholder:text-[#565F73]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#1B2029] pt-3">
                  <span className="font-mono text-[11px] text-[#565F73]">
                    {amountValue > 0 ? "Remaining" : "Total expense is $0.00"}
                  </span>
                  {amountValue > 0 && (
                    <span
                      className={`font-mono text-[12px] ${
                        customRemaining === 0 ? "text-[#34D399]" : "text-[#F2726F]"
                      }`}
                    >
                      ₹{fmt(customRemaining)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-[6px] border border-[#F2726F]/30 bg-[#F2726F]/10 px-3 py-2 text-[13px] text-[#F2726F]">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[13px] text-[#8B93A7] transition-colors hover:text-[#EDEFF3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Creating…" : "Add group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- page ---------------------------------------------------------------

export default function Groups() {
  const { data: session } = useSession();
  const username = (session?.user as { username?: string | null } | undefined)?.username;

  const [rawGroups, setRawGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/group/getgroups");
      if (!res.ok) throw new Error("Couldn't load your groups.");

      const data = await res.json();
      // accept either a bare array or { groups: [...] }
      setRawGroups(Array.isArray(data) ? data : data?.groups ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Derived from the raw documents + who's signed in, so statuses fix themselves
  // as soon as the session (and your username) finishes loading.
  const groupList = useMemo(() => {
    const isMe = makeIsMe(username);
    return rawGroups
      .map((g) => toGroup(g, isMe))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }, [rawGroups, username]);

  const filtered = groupList.filter((g) => {
    if (!g.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (tab === "You owe") return g.status === "owe";
    if (tab === "Settled") return g.status === "settled";
    return true;
  });

  const showCards = !loading && !loadError && groupList.length > 0;
  const openCount = groupList.filter((g) => g.status === "owe").length;

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
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
          .skeleton { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* page header */}
        <div
          className="reveal-anim flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <h1 className="text-[24px] font-medium tracking-[-0.01em]">Your groups</h1>
            <p className="mt-1 text-[13px] text-[#8B93A7]">
              {loading
                ? "Loading your groups…"
                : `${groupList.length} ${groupList.length === 1 ? "group" : "groups"} · ${openCount} with open balances`}
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90 sm:self-auto"
          >
            + New group
          </button>
        </div>

        {/* filters */}
        <div
          className="reveal-anim mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: "100ms" }}
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
            placeholder="Search groups"
            className="w-full rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-2 text-[13px] text-[#EDEFF3] placeholder:text-[#565F73] outline-none focus:border-[#34D399] sm:w-56"
          />
        </div>

        {/* loading skeletons */}
        {loading && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[10px] border border-[#232937] bg-[#12161F] p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="skeleton h-4 w-32 rounded-[4px]" />
                  <div className="skeleton h-8 w-8 rounded-[6px]" />
                </div>
                <div className="mt-5 flex">
                  {[0, 1, 2].map((n) => (
                    <div
                      key={n}
                      className="skeleton -ml-2 h-6 w-6 rounded-full border-2 border-[#12161F] first:ml-0"
                    />
                  ))}
                </div>
                <div className="my-4 h-px bg-[#1B2029]" />
                <div className="flex justify-between">
                  <div className="skeleton h-8 w-20 rounded-[4px]" />
                  <div className="skeleton h-8 w-20 rounded-[4px]" />
                </div>
              </div>
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
              className="rounded-[6px] border border-[#232937] px-4 py-2 font-mono text-[13px] text-[#EDEFF3] transition-colors hover:border-[#34D399]"
            >
              Try again
            </button>
          </div>
        )}

        {/* empty: no groups yet */}
        {!loading && !loadError && groupList.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="text-[15px] text-[#EDEFF3]">No groups yet</p>
            <p className="max-w-xs text-[13px] text-[#8B93A7]">
              Create a group, add the people you share costs with, and log your first expense.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
            >
              + Create your first group
            </button>
          </div>
        )}

        {/* cards */}
        {showCards && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g, i) => {
              const view = statusView(g);
              return (
                <Link
                  key={g.id}
                  href={`/dashboard/groups/${g.id}`}
                  className="reveal-anim group relative overflow-hidden rounded-[10px] border border-[#232937] bg-[#12161F] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#33394A] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                  style={{ animationDelay: `${160 + Math.min(i, 8) * 60}ms` }}
                >
                  {/* accent edge */}
                  <span
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ backgroundColor: g.accent }}
                  />

                  <div className="flex items-start justify-between">
                    <p className="max-w-[70%] text-[15px] font-medium leading-snug text-[#EDEFF3]">
                      {g.name}
                    </p>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] font-mono text-[12px] font-medium text-[#0B0E14]"
                      style={{ backgroundColor: g.accent }}
                    >
                      {initials(g.name)}
                    </span>
                  </div>

                  {/* member stack */}
                  <div className="mt-4 flex items-center">
                    {g.members.slice(0, 4).map((m, idx) => (
                      <span
                        key={idx}
                        title={m}
                        className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#12161F] bg-[#232937] font-mono text-[10px] text-[#EDEFF3] first:ml-0"
                      >
                        {initials(m)}
                      </span>
                    ))}
                    {g.members.length > 4 && (
                      <span className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#12161F] bg-[#0B0E14] font-mono text-[10px] text-[#565F73]">
                        +{g.members.length - 4}
                      </span>
                    )}
                    <span className="ml-2 text-[12px] text-[#565F73]">
                      {g.members.length} {g.members.length === 1 ? "member" : "members"}
                    </span>
                  </div>

                  {/* latest expense */}
                  {g.expenseTitle && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-[6px] bg-[#0B0E14] px-3 py-2">
                      <span className="truncate text-[13px] text-[#EDEFF3]">
                        {g.expenseTitle}
                      </span>
                      {g.splitType && (
                        <span className="shrink-0 font-mono text-[10px] text-[#565F73]">
                          {g.splitType === "equally" ? "equal split" : "custom split"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* divider */}
                  <div className="my-4 h-px bg-[#1B2029]" />

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wide text-[#565F73]">
                        Total spend
                      </p>
                      <p className="mt-0.5 font-mono text-[14px] text-[#8B93A7]">
                        ₹{fmt(g.totalSpend)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-wide text-[#565F73]">
                        {view.label}
                      </p>
                      <p className={`mt-0.5 font-mono text-[16px] ${view.color}`}>
                        {view.value}
                      </p>
                    </div>
                  </div>

                  {g.createdAt && (
                    <p className="mt-3 font-mono text-[11px] text-[#565F73]">
                      Created{" "}
                      {g.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* filters matched nothing */}
        {showCards && filtered.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-[#565F73]">
            No groups match that filter.
          </p>
        )}
      </div>

      <CreateGroupModal
        open={modalOpen}
        myUsername={username}
        onClose={() => setModalOpen(false)}
        onCreated={fetchGroups}
      />
    </main>
  );
}