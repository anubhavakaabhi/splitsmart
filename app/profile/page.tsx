"use client";

import Link from "next/link";
import { useState , useEffect} from "react";
import { useSession, signOut } from "next-auth/react";
import { Inter, JetBrains_Mono } from "next/font/google";
import Navbar from "@/layouts/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Account() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function getUsername() {
      const response = await fetch("/api/getusername");
      const data = await response.json();
      setUsername(data.username);
    }
    getUsername();
  }, []);

  const user = session?.user as
    | { name?: string | null; email?: string | null; username?: string | null; image?: string | null }
    | undefined;

  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3]`}
    >
      <Navbar />
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-anim { opacity: 0; animation: reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #12161F 0%, #1B2029 50%, #12161F 100%);
          background-size: 400px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
          .skeleton { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="reveal-anim" style={{ animationDelay: "40ms" }}>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">Account</h1>
          <p className="mt-1 text-[13px] text-[#8B93A7]">
            check your details
          </p>
        </div>

        {/* loading state */}
        {status === "loading" && (
          <div
            className="reveal-anim mt-8 rounded-[10px] border border-[#232937] bg-[#12161F] p-6"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-4">
              <div className="skeleton h-14 w-14 rounded-full" />
              <div className="flex flex-col gap-2">
                <div className="skeleton h-4 w-32 rounded-[4px]" />
                <div className="skeleton h-3 w-40 rounded-[4px]" />
              </div>
            </div>
          </div>
        )}

        {/* signed out state */}
        {status === "unauthenticated" && (
          <div
            className="reveal-anim mt-8 rounded-[10px] border border-[#232937] bg-[#12161F] p-6 text-center"
            style={{ animationDelay: "100ms" }}
          >
            <p className="text-[14px] text-[#8B93A7]">
              You're not logged in.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
            >
              Log in
            </Link>
          </div>
        )}

        {/* signed in state */}
        {status === "authenticated" && (
          <div
            className="reveal-anim mt-8 rounded-[10px] border border-[#232937] bg-[#12161F] p-6"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-4">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "Profile picture"}
                  className="h-14 w-14 rounded-full border border-[#232937] object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#232937] font-mono text-[18px] text-[#EDEFF3]">
                  {initials(user?.name)}
                </div>
              )}

              <div>
                <p className="text-[16px] font-medium text-[#EDEFF3]">
                  {user?.name ?? "—"}
                </p>
                <p className="font-mono text-[13px] text-[#565F73]">
                  @{username ? username : "no-username"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col divide-y divide-[#1B2029] border-t border-[#1B2029]">
              <div className="flex items-center justify-between py-4">
                <p className="font-mono text-[12px] text-[#8B93A7]">Name</p>
                <p className="text-[14px] text-[#EDEFF3]">{user?.name ?? "—"}</p>
              </div>
              <div className="flex items-center justify-between py-4">
                <p className="font-mono text-[12px] text-[#8B93A7]">Username</p>
                <p className="text-[14px] text-[#EDEFF3]">
                  {username ? `@${username}` : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between py-4">
                <p className="font-mono text-[12px] text-[#8B93A7]">Email</p>
                <p className="text-[14px] text-[#EDEFF3]">{user?.email ?? "—"}</p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="mt-6 w-full rounded-[6px] border border-[#232937] py-2.5 font-mono text-[13px] text-[#F2726F] transition-colors hover:border-[#F2726F]/50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </main>
  );
}