"use client";

import { useActionState } from "react";
import {
  acceptMatchAction,
  createIntroductionAction,
  dismissMatchAction,
  type MatchActionResult,
} from "@/app/actions/matching";

function ActionForm({
  action,
  label,
}: {
  action: (prev: MatchActionResult | null, formData: FormData) => Promise<MatchActionResult>;
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

export function MatchActions({
  matchId,
  status,
  canReview,
  hasIntroduction,
}: {
  matchId: string;
  status: string;
  canReview: boolean;
  hasIntroduction: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canReview && status === "suggested" && (
        <>
          <ActionForm action={acceptMatchAction.bind(null, matchId)} label="Mark reviewed" />
          <ActionForm action={dismissMatchAction.bind(null, matchId)} label="Dismiss" />
        </>
      )}
      {status === "reviewed" && !hasIntroduction && (
        <ActionForm action={createIntroductionAction.bind(null, matchId)} label="Create draft introduction" />
      )}
    </div>
  );
}