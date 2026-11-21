"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createMatchAction, type MatchActionResult } from "@/app/actions/matching";
import { ArrowLeftIcon, LinkIcon } from "@/app/components/icons";

interface Option {
  id: string;
  title: string;
}

const inputClass =
  "w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900";

export function MatchForm({
  opportunities,
  requirements,
}: {
  opportunities: Option[];
  requirements: Option[];
}) {
  const [state, formAction, pending] = useActionState<MatchActionResult | null, FormData>(createMatchAction, null);

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>
      )}
      {opportunities.length === 0 || requirements.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-6 text-sm text-muted shadow-sm">
          Record at least one opportunity and one buyer requirement before creating a match.
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Opportunity</label>
            <select name="mineral_opportunity_id" required className={inputClass}>
              <option value="">— Select —</option>
              {opportunities.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Buyer requirement</label>
            <select name="buyer_requirement_id" required className={inputClass}>
              <option value="">— Select —</option>
              {requirements.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Confidence (0–100)</label>
            <input name="confidence" type="number" min={0} max={100} defaultValue={100} className={inputClass} />
            <p className="mt-1 text-xs text-muted">This is a member’s assessment. It is stored with the match and is not an automatic commodity score.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Why these belong together</label>
            <textarea name="note" rows={3} className={inputClass} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || opportunities.length === 0 || requirements.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60">
          <LinkIcon className="h-4 w-4" />
          {pending ? "Saving…" : "Save match"}
        </button>
        <Link href="/matching" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Cancel
        </Link>
      </div>
    </form>
  );
}
