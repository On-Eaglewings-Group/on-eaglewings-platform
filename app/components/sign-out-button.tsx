"use client";

import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";

export function SignOutButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      await signOutAction();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) {
        throw err;
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-charcoal shadow-sm transition hover:bg-workspace disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Signing out…" : compact ? <><span className="sm:hidden">Exit</span><span className="hidden sm:inline">Sign out</span></> : "Sign out"}
      </button>
    </form>
  );
}
