import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export default async function Home() {
  const session = await getServerSession(authOptions)
  if(session){
    redirect("/dashboard")
  }
  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3] flex items-center justify-center px-6`}
    >
      <style>{`
        @keyframes rule-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes reveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50% { box-shadow: 0 0 0 3px transparent; opacity: 0.55; }
        }
        .rule-anim { animation: rule-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .reveal-anim { opacity: 0; animation: reveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .dot-anim { animation: dot-pulse 2.4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .rule-anim, .reveal-anim, .dot-anim {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-2xl py-16">
        {/* top rule */}
        <div className="rule-anim h-px w-full origin-center bg-[#232937]" />

        {/* header */}
        <div
          className="reveal-anim flex items-center justify-between py-6"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#34D399] font-mono text-[13px] font-medium leading-none text-[#0B0E14]">
              S
            </span>
            <span className="font-mono text-[15px] tracking-tight text-[#EDEFF3]">
              SplitSmart
            </span>
          </div>

          <Link
            href="/login"
            className="font-mono text-[13px] text-[#8B93A7] transition-colors duration-200 hover:text-[#EDEFF3]"
          >
            Login
          </Link>
        </div>

        {/* hero */}
        <div className="pl-1 pt-16 sm:pl-6">
          <h1 className="text-[34px] font-medium leading-[1.15] tracking-[-0.01em] sm:text-[42px]">
            <span
              className="reveal-anim block text-[#EDEFF3]"
              style={{ animationDelay: "220ms" }}
            >
              Split expenses.
            </span>
            <span
              className="reveal-anim block text-[#34D399]"
              style={{ animationDelay: "340ms" }}
            >
              Not friendships.
            </span>
          </h1>

          <p
            className="reveal-anim mt-6 max-w-[30ch] text-[15px] leading-relaxed text-[#8B93A7] sm:max-w-[38ch] sm:text-[16px]"
            style={{ animationDelay: "460ms" }}
          >
            Track group expenses, split bills, and know exactly who owes
            whom.
          </p>

          <div
            className="reveal-anim mt-10"
            style={{ animationDelay: "580ms" }}
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 font-mono text-[14px] text-[#EDEFF3] transition-colors duration-200 hover:text-[#34D399]"
            >
              <span className="inline-block text-[#8B93A7] transition-all duration-200 group-hover:-translate-x-0.5 group-hover:text-[#34D399]">
                [
              </span>
              Get started
              <span className="inline-block text-[#8B93A7] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#34D399]">
                ]
              </span>
            </Link>
          </div>
        </div>

        {/* quiet ledger accent: a nod to the app's own debt/credit color language */}
        <div
          className="reveal-anim mt-16 flex items-center gap-4 pl-1 font-mono text-[12px] text-[#565F73] sm:pl-6"
          style={{ animationDelay: "700ms" }}
        >
          <span className="flex items-center gap-1.5">
            <span className="dot-anim h-1.5 w-1.5 rounded-full bg-[#F2726F] text-[#F2726F]" />
            you owe
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="dot-anim h-1.5 w-1.5 rounded-full bg-[#34D399] text-[#34D399]"
              style={{ animationDelay: "1.2s" }}
            />
            you're owed
          </span>
        </div>

        {/* bottom rule */}
        <div
          className="rule-anim mt-16 h-px w-full origin-center bg-[#232937]"
          style={{ animationDelay: "800ms" }}
        />
      </div>
    </main>
  );
}