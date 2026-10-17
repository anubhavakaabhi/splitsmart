"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

type SessionUser = {
  name?: string | null;
  email?: string | null;
  username?: string | null;
  image?: string | null;
};

const NAME_MAX = 50;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Avatar({ image, name }: { image?: string | null; name?: string | null }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#5F7684] bg-[#4A5D69] text-[20px] text-white">
      {image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export default function Settings() {
  const { data: session, status, update } = useSession();
  const user = session?.user as SessionUser | undefined;

  const savedName = user?.name ?? "";
  const savedUsername = user?.username ?? "";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; username?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // fill the form once, when the session first becomes available
  const hydrated = useRef(false);
  useEffect(() => {
    if (status === "authenticated" && !hydrated.current) {
      setName(savedName);
      setUsername(savedUsername);
      hydrated.current = true;
    }
  }, [status, savedName, savedUsername]);

  // hide the "saved" confirmation after a few seconds
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  // ---- validation ----
  const trimmedName = name.trim();
  const nameChanged = trimmedName !== savedName;
  const usernameChanged = username !== savedUsername;
  const dirty = nameChanged || usernameChanged;

  const nameError =
    trimmedName.length === 0
      ? "Name can't be empty."
      : trimmedName.length > NAME_MAX
      ? `Keep it under ${NAME_MAX} characters.`
      : null;

  const usernameError = !USERNAME_RE.test(username)
    ? "Use 3–30 lowercase letters, numbers or underscores."
    : null;

  const canSave = dirty && !nameError && !usernameError && !saving;

  function discard() {
    setName(savedName);
    setUsername(savedUsername);
    setUsernameTouched(false);
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setSaved(false);
    setFormError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, username }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.field === "name" || data?.field === "username") {
          setFieldErrors({ [data.field]: data.message });
        } else {
          setFormError(data?.message || "Couldn't save your changes. Try again.");
        }
        return;
      }

      const newName = data?.name ?? trimmedName;
      const newUsername = data?.username ?? username;

      // refresh the NextAuth session so the navbar / profile show the new values
      // (needs next-auth >= 4.22 and the `trigger === "update"` jwt callback)
      await update?.({ name: newName, username: newUsername });

      setName(newName);
      setUsername(newUsername);
      setUsernameTouched(false);
      setSaved(true);
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

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
          background: linear-gradient(90deg, #12161F 0%, #1B2029 50%, #12161F 100%);
          background-size: 400px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
          .skeleton { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="reveal-anim" style={{ animationDelay: "40ms" }}>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">Settings</h1>
          <p className="mt-1 text-[13px] text-[#8B93A7]">Update how you appear to your groups</p>
        </div>

        {/* loading */}
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
            <div className="skeleton mt-8 h-11 w-full rounded-[6px]" />
            <div className="skeleton mt-4 h-11 w-full rounded-[6px]" />
          </div>
        )}

        {/* signed out */}
        {status === "unauthenticated" && (
          <div
            className="reveal-anim mt-8 rounded-[10px] border border-[#232937] bg-[#12161F] p-6 text-center"
            style={{ animationDelay: "100ms" }}
          >
            <p className="text-[14px] text-[#8B93A7]">You're not logged in.</p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90"
            >
              Log in
            </Link>
          </div>
        )}

        {/* signed in */}
        {status === "authenticated" && (
          <div
            className="reveal-anim mt-8 rounded-[10px] border border-[#232937] bg-[#12161F] p-6"
            style={{ animationDelay: "100ms" }}
          >
            {/* current identity */}
            <div className="flex items-center gap-4">
              <Avatar image={user?.image} name={savedName || user?.email} />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-medium">{savedName || "—"}</p>
                <p className="truncate font-mono text-[13px] text-[#565F73]">
                  @{savedUsername || "no-username"}
                </p>
              </div>
            </div>

            <div className="my-6 h-px bg-[#1B2029]" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              {/* name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="font-mono text-[12px] text-[#8B93A7]">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  maxLength={NAME_MAX + 10}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((f) => ({ ...f, name: undefined }));
                  }}
                  autoComplete="name"
                  aria-invalid={!!(fieldErrors.name || (nameChanged && nameError))}
                  className="rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 py-2.5 text-[16px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] focus:border-[#34D399] sm:text-[14px]"
                />
                {(fieldErrors.name || (nameChanged && nameError)) && (
                  <p className="text-[12px] text-[#F2726F]">{fieldErrors.name ?? nameError}</p>
                )}
              </div>

              {/* username */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="font-mono text-[12px] text-[#8B93A7]">
                  Username
                </label>
                <div className="flex items-center rounded-[6px] border border-[#232937] bg-[#0B0E14] px-3 focus-within:border-[#34D399]">
                  <span className="font-mono text-[14px] text-[#565F73]">@</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      // keep it lowercase and strip anything the server would reject
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                      setFieldErrors((f) => ({ ...f, username: undefined }));
                    }}
                    onBlur={() => setUsernameTouched(true)}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={30}
                    aria-invalid={!!(fieldErrors.username || (usernameTouched && usernameError))}
                    className="w-full bg-transparent py-2.5 pl-1.5 text-[16px] text-[#EDEFF3] outline-none placeholder:text-[#565F73] sm:text-[14px]"
                  />
                </div>
                {fieldErrors.username || (usernameTouched && usernameError) ? (
                  <p className="text-[12px] text-[#F2726F]">
                    {fieldErrors.username ?? usernameError}
                  </p>
                ) : (
                  <p className="text-[12px] text-[#565F73]">
                    Your groups use this to find you
                    {usernameChanged && " — it'll be updated in all your groups"}.
                  </p>
                )}
              </div>

              {/* email (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="font-mono text-[12px] text-[#8B93A7]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  className="cursor-not-allowed rounded-[6px] border border-[#1B2029] bg-[#0B0E14]/50 px-3 py-2.5 text-[16px] text-[#565F73] outline-none sm:text-[14px]"
                />
                <p className="text-[12px] text-[#565F73]">
                  Email is tied to how you sign in, so it can't be changed here.
                </p>
              </div>

              {formError && (
                <p className="rounded-[6px] border border-[#F2726F]/30 bg-[#F2726F]/10 px-3 py-2 text-[13px] text-[#F2726F]">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <p
                  aria-live="polite"
                  className={`font-mono text-[12px] text-[#34D399] transition-opacity duration-300 ${
                    saved ? "opacity-100" : "opacity-0"
                  }`}
                >
                  ✓ Changes saved
                </p>

                <div className="flex items-center gap-3">
                  {dirty && !saving && (
                    <button
                      type="button"
                      onClick={discard}
                      className="font-mono text-[13px] text-[#8B93A7] transition-colors hover:text-[#EDEFF3]"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="rounded-[6px] bg-[#34D399] px-4 py-2 font-mono text-[13px] font-medium text-[#0B0E14] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}