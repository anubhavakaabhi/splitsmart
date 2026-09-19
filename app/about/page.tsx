import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const steps = [
  {
    n: "01",
    title: "Create a group",
    body: "Add the people you split costs with — roommates, a trip, a team. One group, one running tally.",
  },
  {
    n: "02",
    title: "Add expenses",
    body: "Log what was paid and by whom. Split it evenly, by share, or by exact amount.",
  },
  {
    n: "03",
    title: "Settle up",
    body: "SplitSmart works out who owes whom, and by how much, so no one has to do the math.",
  },
];

export default function About() {
  return (
    <main
      className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-[#0B0E14] text-[#EDEFF3] flex justify-center px-6`}
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
        .rule-anim { animation: rule-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .reveal-anim { opacity: 0; animation: reveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @media (prefers-reduced-motion: reduce) {
          .rule-anim, .reveal-anim {
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
          style={{ animationDelay: "80ms" }}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#34D399] font-mono text-[13px] font-medium leading-none text-[#0B0E14]">
              S
            </span>
            <span className="font-mono text-[15px] tracking-tight text-[#EDEFF3]">
              SplitSmart
            </span>
          </Link>

          <nav className="flex items-center gap-6 font-mono text-[13px]">
            <Link
              href="/"
              className="text-[#8B93A7] transition-colors duration-200 hover:text-[#EDEFF3]"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="text-[#8B93A7] transition-colors duration-200 hover:text-[#EDEFF3]"
            >
              Login
            </Link>
          </nav>
        </div>

        {/* hero */}
        <div className="pl-1 pt-16 sm:pl-6">
          <h1
            className="reveal-anim text-[34px] font-medium leading-[1.15] tracking-[-0.01em] sm:text-[42px]"
            style={{ animationDelay: "180ms" }}
          >
            Money's easier to talk about
            <br />
            when the math is already done.
          </h1>

          <p
            className="reveal-anim mt-6 max-w-[34ch] text-[15px] leading-relaxed text-[#8B93A7] sm:max-w-[46ch] sm:text-[16px]"
            style={{ animationDelay: "300ms" }}
          >
            SplitSmart started as a simple idea: the awkward part of sharing
            costs isn't the money, it's the uncertainty. We built a place
            where every group expense is logged, split, and settled in the
            open, so nobody has to keep score in their head.
          </p>
        </div>

        {/* how it works — a real sequence, so numbering earns its place */}
        <div className="pl-1 pt-16 sm:pl-6">
          <h2
            className="reveal-anim font-mono text-[13px] text-[#565F73]"
            style={{ animationDelay: "400ms" }}
          >
            How it works
          </h2>

          <div className="mt-6 flex flex-col">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className="reveal-anim flex gap-5 border-t border-[#1B2029] py-6 first:border-t-0 first:pt-0"
                style={{ animationDelay: `${480 + i * 100}ms` }}
              >
                <span className="pt-0.5 font-mono text-[13px] text-[#34D399]">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-[16px] font-medium text-[#EDEFF3]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[42ch] text-[14px] leading-relaxed text-[#8B93A7]">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA back into the product */}
        <div
          className="reveal-anim pl-1 pt-16 sm:pl-6"
          style={{ animationDelay: "820ms" }}
        >
          <Link
            href="/signup"
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

        {/* bottom rule */}
        <div
          className="rule-anim mt-16 h-px w-full origin-center bg-[#232937]"
          style={{ animationDelay: "900ms" }}
        />
      </div>
    </main>
  );
}