"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// ---- types ---------------------------------------------------------------

type Group = {
  id?: string;
  name: string;
  accent: string;
  members: string[];
  lastActivity: string;
  totalSpend: number;
  balance: number;
};

// ---- mock data -------------------------------------------------------

const initialGroups: Group[] = [
  {
    name: "Flatmates' Expenses",
    accent: "#5B8DEF",
    members: ["J", "D", "M", "S"],
    lastActivity: "Jan 13",
    totalSpend: 1240.8,
    balance: 20.0,
  },
  {
    name: "Summer Vacation",
    accent: "#F5B95B",
    members: ["Y", "A", "R"],
    lastActivity: "Jan 17",
    totalSpend: 3860.0,
    balance: 10.0,
  },
  {
    name: "Friday Dinner Crew",
    accent: "#B084F0",
    members: ["M", "J", "K", "L", "T"],
    lastActivity: "Jan 27",
    totalSpend: 512.5,
    balance: 45.5,
  },
  {
    name: "Das Flatmates",
    accent: "#F2726F",
    members: ["D", "S"],
    lastActivity: "Jan 27",
    totalSpend: 340.0,
    balance: -15.0,
  },
  {
    name: "Summer Expenses",
    accent: "#34D399",
    members: ["Y", "N", "C", "P"],
    lastActivity: "Jan 30",
    totalSpend: 980.25,
    balance: -25.0,
  },
  {
    name: "Ski Trip 2026",
    accent: "#5B8DEF",
    members: ["A", "B", "C"],
    lastActivity: "Feb 2",
    totalSpend: 2140.0,
    balance: 0,
  },
];

const tabs = ["All", "You owe", "You're owed", "Settled"] as const;
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

// ---- create group + expense modal ----------------------------------------

function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidBy, setPaidBy] = useState("You");
  const [splitType, setSplitType] = useState<"equally" | "custom">("equally");
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

  const cleanMembers = members.map((m) => m.trim()).filter(Boolean);
  const canSubmit = groupName.trim().length > 0 && !submitting;

  function updateMember(i: number, value: string) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? value : m)));
  }

  function addMemberField() {
    setMembers((prev) => [...prev, ""]);
  }

  function removeMemberField(i: number) {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function reset() {
    setGroupName("");
    setMembers([""]);
    setExpenseTitle("");
    setExpenseAmount("");
    setPaidBy("You");
    setSplitType("equally");
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
            amount: parseFloat(expenseAmount) || 0,
            paidBy,
            splitType,
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

      const data = await res.json().catch(() => null);

      onCreated({
        id: data?.id,
        name: payload.name,
        accent: accentPalette[Math.floor(Math.random() * accentPalette.length)],
        members: cleanMembers.length ? cleanMembers.map((m) => initials(m)) : ["Y"],
        lastActivity: "Just now",
        totalSpend: payload.expense?.amount ?? 0,
        balance: 0,
      });

      reset();
      onClose();
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
        .backdrop-anim { animation: backdrop-in 0.2s ease-out both; }
        .panel-anim { animation: panel-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .backdrop-anim, .panel-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
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
        className="panel-anim relative w-full max-w-md rounded-[10px] border border-[#232937] bg-[#12161F] p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]"
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
                    placeholder="Name or email"
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
                {cleanMembers.map((m, i) => (
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
              onClick= {handleSubmit}
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
  const [groupList, setGroupList] = useState<Group[]>(initialGroups);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = groupList.filter((g) => {
    if (!g.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (tab === "You owe") return g.balance < 0;
    if (tab === "You're owed") return g.balance > 0;
    if (tab === "Settled") return g.balance === 0;
    return true;
  });

  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3]`}
    >
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-anim { opacity: 0; animation: reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
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
              {groupList.length} groups · {groupList.filter((g) => g.balance !== 0).length} with open balances
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

        {/* cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g, i) => (
            <Link
              key={g.id ?? g.name}
              href="/dashboard/groups/1"
              className="reveal-anim group relative overflow-hidden rounded-[10px] border border-[#232937] bg-[#12161F] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#33394A] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
              style={{ animationDelay: `${160 + i * 60}ms` }}
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
                    className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#12161F] bg-[#232937] font-mono text-[10px] text-[#EDEFF3] first:ml-0"
                  >
                    {m}
                  </span>
                ))}
                {g.members.length > 4 && (
                  <span className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#12161F] bg-[#0B0E14] font-mono text-[10px] text-[#565F73]">
                    +{g.members.length - 4}
                  </span>
                )}
                <span className="ml-2 text-[12px] text-[#565F73]">
                  {g.members.length} members
                </span>
              </div>

              {/* divider */}
              <div className="my-4 h-px bg-[#1B2029]" />

              <div className="flex items-end justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#565F73]">
                    Total spend
                  </p>
                  <p className="mt-0.5 font-mono text-[14px] text-[#8B93A7]">
                    ${fmt(g.totalSpend)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#565F73]">
                    {g.balance === 0 ? "Settled" : g.balance > 0 ? "You're owed" : "You owe"}
                  </p>
                  <p
                    className={`mt-0.5 font-mono text-[16px] ${
                      g.balance === 0
                        ? "text-[#565F73]"
                        : g.balance > 0
                        ? "text-[#34D399]"
                        : "text-[#F2726F]"
                    }`}
                  >
                    {g.balance === 0 ? "$0.00" : `$${fmt(g.balance)}`}
                  </p>
                </div>
              </div>

              <p className="mt-3 font-mono text-[11px] text-[#565F73]">
                Last activity {g.lastActivity}
              </p>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-[#565F73]">
            No groups match that filter.
          </p>
        )}
      </div>

      <CreateGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(newGroup) => setGroupList((prev) => [newGroup, ...prev])}
      />
    </main>
  );
}