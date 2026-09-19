"use client"
import React from 'react'
import Link from 'next/link'
import { useState } from 'react'
import { useParams } from 'next/navigation'

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activePage, setActivePage] = useState("dashboard");
    const id = useParams().id;
  return (
    <header className="border-b border-[#1B2029]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#34D399] font-mono text-[13px] font-medium leading-none text-[#0B0E14]">
                S
              </span>
              <span className="font-mono text-[15px] tracking-tight">
                SplitSmart
              </span>
            </Link>

            <nav className="hidden items-center gap-6 font-mono text-[13px] text-[#8B93A7] md:flex">
              <Link href="/dashboard" onClick={()=>setActivePage("dashboard")} className={`transition-colors hover:text-[#EDEFF3] ${activePage==="dashboard"? "text-[#EDEFF3]": "" }`}>Dashboard</Link>
              <Link href="/dashboard/groups" onClick={()=>setActivePage("groups")} className={`transition-colors hover:text-[#EDEFF3] ${activePage==="groups"? "text-[#EDEFF3]": "" }`}>
                My Groups
              </Link>
              <Link href={`/dashboard/groups/expenses`} onClick={()=>setActivePage("expenses")} className={`transition-colors hover:text-[#EDEFF3] ${activePage==="expenses"? "text-[#EDEFF3]": "" }`}>
                Expenses
              </Link>
              <Link href="/dashboard/activity" onClick={()=>setActivePage("activity")} className={`transition-colors hover:text-[#EDEFF3] ${activePage==="activity"? "text-[#EDEFF3]": "" }`}>
                Activity
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search"
              className="hidden w-44 rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-1.5 text-[13px] text-[#EDEFF3] placeholder:text-[#565F73] outline-none focus:border-[#34D399] sm:block"
            />

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#232937] font-mono text-[13px] text-[#EDEFF3]"
              >
                A
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 w-36 rounded-[6px] border border-[#232937] bg-[#12161F] py-1 font-mono text-[13px] shadow-lg">
                  <Link href="/account" className="block px-3 py-2 text-[#8B93A7] hover:text-[#EDEFF3]">
                    Profile
                  </Link>
                  <Link href="/account/settings" className="block px-3 py-2 text-[#8B93A7] hover:text-[#EDEFF3]">
                    Settings
                  </Link>
                  <Link href="/logout" className="block px-3 py-2 text-[#F2726F] hover:text-[#EDEFF3]">
                    Log out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
  )
}

export default Navbar