"use client";

import { useState } from "react";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import { useParams } from "next/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// ---- mock data -------------------------------------------------------

const groups = [
  { name: "Flatmates' Expenses", lastActivity: "Jan 13", balance: 20.0 },
  { name: "Summer Vacation", lastActivity: "Jan 17", balance: 10.0 },
  { name: "Friday Dinner Crew", lastActivity: "Jan 27", balance: 45.5 },
  { name: "Das Flatmates", lastActivity: "Jan 27", balance: -15.0 },
];

const activity = [
  {
    person: "John",
    initial: "J",
    action: "added 'Groceries' in Flatmates'",
    amount: "$60.00",
    time: "12:58 am",
  },
  {
    person: "You",
    initial: "Y",
    action: "settled up with Sarah",
    amount: "$25.00",
    time: "13:52",
    settled: true,
  },
  {
    person: "Maria",
    initial: "M",
    action: "added 'Pizza' in Friday Dinner Crew",
    amount: "$45.50",
    time: "13:53",
  },
  {
    person: "John",
    initial: "J",
    action: "added 'Pizza' in Friday Dinner Crew",
    amount: "$45.00",
    time: "13:54",
  },
];

const balances = [
  { text: "David owes you", amount: 35.0, positive: true },
  { text: "You owe David", amount: 12.0, positive: false },
  { text: "You owe Lisa", amount: 12.5, positive: false },
];

const spendCategories = [
  { label: "Groceries", pct: 34, color: "#5B8DEF" },
  { label: "Dining", pct: 27, color: "#F5B95B" },
  { label: "Travel", pct: 22, color: "#B084F0" },
  { label: "Other", pct: 17, color: "#565F73" },
];

const weekBars = [
  { day: "M", value: 30 },
  { day: "T", value: 55 },
  { day: "W", value: 40 },
  { day: "T", value: 80 },
  { day: "F", value: 95 },
  { day: "S", value: 60 },
  { day: "S", value: 25 },
];

// ---- helpers -----------------------------------------------------------

function donutGradient(categories: typeof spendCategories) {
  let acc = 0;
  const stops = categories.map((c) => {
    const start = acc;
    acc += c.pct;
    return `${c.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- page ---------------------------------------------------------------

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const id = useParams().id;
  const youOwe = balances.filter((b) => !b.positive).reduce((s, b) => s + b.amount, 0);
  const youAreOwed = balances.filter((b) => b.positive).reduce((s, b) => s + b.amount, 0);

  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3]`}
    >
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-anim { opacity: 0; animation: reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* totals + quick actions */}
        <div
          className="reveal-anim grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "60ms" }}
        >
          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-5 lg:col-span-1">
            <p className="font-mono text-[12px] text-[#8B93A7]">You owe</p>
            <p className="mt-2 font-mono text-[28px] text-[#F2726F]">${fmt(youOwe)}</p>
            <Link href="/expenses?filter=owe" className="mt-2 inline-block text-[13px] text-[#565F73] hover:text-[#EDEFF3]">
              View details →
            </Link>
          </div>

          <div className="rounded-[8px] border border-[#232937] bg-[#12161F] p-5 lg:col-span-1">
            <p className="font-mono text-[12px] text-[#8B93A7]">You're owed</p>
            <p className="mt-2 font-mono text-[28px] text-[#34D399]">${fmt(youAreOwed)}</p>
            <Link href="/expenses?filter=owed" className="mt-2 inline-block text-[13px] text-[#565F73] hover:text-[#EDEFF3]">
              View details →
            </Link>
          </div>

          <div className="flex flex-col justify-center gap-2 rounded-[8px] border border-[#232937] bg-[#12161F] p-5 lg:col-span-2">
            <p className="mb-1 font-mono text-[12px] text-[#8B93A7]">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-[6px] bg-[#34D399] px-3 py-1.5 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90">
                Add expense
              </button>
              <button className="rounded-[6px] border border-[#232937] px-3 py-1.5 font-mono text-[13px] text-[#EDEFF3] transition-colors hover:border-[#34D399]">
                Create group
              </button>
              <button className="rounded-[6px] border border-[#232937] px-3 py-1.5 font-mono text-[13px] text-[#EDEFF3] transition-colors hover:border-[#34D399]">
                Settle up
              </button>
            </div>
          </div>
        </div>

        {/* groups */}
        <div className="reveal-anim mt-10" style={{ animationDelay: "140ms" }}>
          <h2 className="font-mono text-[13px] text-[#8B93A7]">Your groups</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((g) => (
              <Link
                key={g.name}
                href="/groups"
                className="rounded-[8px] border border-[#232937] bg-[#12161F] p-4 transition-colors hover:border-[#34D399]/50"
              >
                <p className="text-[14px] font-medium text-[#EDEFF3]">{g.name}</p>
                <p className="mt-1 text-[12px] text-[#565F73]">
                  Last activity {g.lastActivity}
                </p>
                <p
                  className={`mt-3 font-mono text-[14px] ${
                    g.balance >= 0 ? "text-[#34D399]" : "text-[#F2726F]"
                  }`}
                >
                  {g.balance >= 0 ? "+" : "-"}${fmt(Math.abs(g.balance))}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* activity + balances + spending */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* recent activity */}
          <div
            className="reveal-anim rounded-[8px] border border-[#232937] bg-[#12161F] p-5 lg:col-span-1"
            style={{ animationDelay: "220ms" }}
          >
            <h2 className="font-mono text-[13px] text-[#8B93A7]">Recent activity</h2>
            <div className="mt-4 flex flex-col divide-y divide-[#1B2029]">
              {activity.map((a, i) => (
                <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#232937] font-mono text-[12px]">
                    {a.initial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug text-[#EDEFF3]">
                      <span className="font-medium">{a.person}</span>{" "}
                      <span className="text-[#8B93A7]">{a.action}</span>{" "}
                      <span className={a.settled ? "text-[#34D399]" : ""}>
                        ({a.amount})
                      </span>
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[#565F73]">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* balances */}
          <div
            className="reveal-anim rounded-[8px] border border-[#232937] bg-[#12161F] p-5 lg:col-span-1"
            style={{ animationDelay: "300ms" }}
          >
            <h2 className="font-mono text-[13px] text-[#8B93A7]">Balances</h2>
            <div className="mt-4 flex flex-col divide-y divide-[#1B2029]">
              {balances.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <p className="text-[13px] text-[#EDEFF3]">{b.text}</p>
                  <p className={`font-mono text-[13px] ${b.positive ? "text-[#34D399]" : "text-[#F2726F]"}`}>
                    ${fmt(b.amount)}
                  </p>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-[6px] border border-[#232937] py-2 font-mono text-[13px] text-[#EDEFF3] transition-colors hover:border-[#34D399]">
              Settle up
            </button>
          </div>

          {/* spending breakdown + weekly bars */}
          <div
            className="reveal-anim rounded-[8px] border border-[#232937] bg-[#12161F] p-5 lg:col-span-1"
            style={{ animationDelay: "380ms" }}
          >
            <h2 className="font-mono text-[13px] text-[#8B93A7]">Spending this month</h2>

            <div className="mt-4 flex items-center gap-5">
              <div
                className="h-20 w-20 shrink-0 rounded-full"
                style={{
                  background: donutGradient(spendCategories),
                  WebkitMask: "radial-gradient(farthest-side, transparent 62%, #000 63%)",
                  mask: "radial-gradient(farthest-side, transparent 62%, #000 63%)",
                }}
              />
              <div className="flex flex-col gap-1.5">
                {spendCategories.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-[12px] text-[#8B93A7]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.label}
                    <span className="text-[#565F73]">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="mt-6 font-mono text-[12px] text-[#565F73]">Last 7 days</h3>
            <div className="mt-3 flex h-16 items-end gap-2">
              {weekBars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-[2px] bg-[#5B8DEF]/70"
                    style={{ height: `${b.value}%` }}
                  />
                  <span className="font-mono text-[10px] text-[#565F73]">{b.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}