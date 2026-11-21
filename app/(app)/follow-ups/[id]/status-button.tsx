"use client";

import { useActionState } from "react";
import type { FollowUpActionResult } from "@/app/actions/follow-ups";

export function StatusButton({
  action,
  label,
}: {
  action: (prev: FollowUpActionResult | null, formData: FormData) => Promise<FollowUpActionResult>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-charcoal hover:bg-workspace disabled:opacity-60">
        {pending ? "Saving…" : label}
      </button>
      {state && !state.ok && state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}