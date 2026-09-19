"use client";

import { useState } from "react";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        .rule-anim { animation: rule-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .reveal-anim { opacity: 0; animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .rule-anim, .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div className="w-full max-w-sm py-16">
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
            <span className="font-mono text-[15px] tracking-tight">
              SplitSmart
            </span>
          </Link>

          <Link
            href="/signup"
            className="font-mono text-[13px] text-[#8B93A7] transition-colors duration-200 hover:text-[#EDEFF3]"
          >
            Sign up
          </Link>
        </div>

        {/* form */}
        <div className="pt-14">
          <h1
            className="reveal-anim text-[28px] font-medium tracking-[-0.01em]"
            style={{ animationDelay: "160ms" }}
          >
            Log in
          </h1>
          <p
            className="reveal-anim mt-2 text-[14px] text-[#8B93A7]"
            style={{ animationDelay: "220ms" }}
          >
            Pick up where you and your groups left off.
          </p>

          <button
            type="button"
            className="reveal-anim mt-8 flex w-full items-center justify-center gap-3 rounded-[6px] border border-[#232937] bg-[#12161F] py-2.5 text-[14px] font-medium text-[#EDEFF3] transition-colors duration-200 hover:border-[#565F73]"
            style={{ animationDelay: "280ms" }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div
            className="reveal-anim my-6 flex items-center gap-3"
            style={{ animationDelay: "340ms" }}
          >
            <div className="h-px flex-1 bg-[#232937]" />
            <span className="font-mono text-[11px] text-[#565F73]">or</span>
            <div className="h-px flex-1 bg-[#232937]" />
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <div
              className="reveal-anim flex flex-col gap-1.5"
              style={{ animationDelay: "400ms" }}
            >
              <label htmlFor="email" className="font-mono text-[12px] text-[#8B93A7]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-2.5 text-[14px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] focus:border-[#34D399]"
              />
            </div>

            <div
              className="reveal-anim flex flex-col gap-1.5"
              style={{ animationDelay: "460ms" }}
            >
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="font-mono text-[12px] text-[#8B93A7]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-[#565F73] transition-colors duration-200 hover:text-[#EDEFF3]"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-[6px] border border-[#232937] bg-[#12161F] px-3 py-2.5 text-[14px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] focus:border-[#34D399]"
              />
            </div>

            <button
              type="submit"
              className="reveal-anim mt-2 rounded-[6px] bg-[#34D399] py-2.5 font-mono text-[14px] font-medium text-[#0B0E14] transition-opacity duration-200 hover:opacity-90"
              style={{ animationDelay: "520ms" }}
            >
              Log in
            </button>
          </form>

          <p
            className="reveal-anim mt-6 text-center text-[13px] text-[#8B93A7]"
            style={{ animationDelay: "580ms" }}
          >
            Don't have an account?{" "}
            <Link href="/signup" className="text-[#EDEFF3] hover:text-[#34D399]">
              Sign up
            </Link>
          </p>
        </div>

        {/* bottom rule */}
        <div
          className="rule-anim mt-16 h-px w-full origin-center bg-[#232937]"
          style={{ animationDelay: "700ms" }}
        />
      </div>
    </main>
  );
}