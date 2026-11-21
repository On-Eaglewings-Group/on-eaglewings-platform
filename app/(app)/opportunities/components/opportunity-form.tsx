"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOpportunityAction,
  updateOpportunityAction,
  type OpportunityActionResult,
} from "@/app/actions/opportunities";
import { ArrowLeftIcon, GemIcon } from "@/app/components/icons";
import Link from "next/link";

interface Organization {
  id: string;
  legal_name: string;
  trading_name: string | null;
}

interface Mine {
  id: string;
  name: string;
  country_code: string | null;
}

interface WorkspaceMember {
  user_id: string;
  user_profiles: { display_name: string | null } | null;
}

interface OpportunityFormProps {
  mode: "create" | "edit";
  opportunityId?: string;
  organizations: Organization[];
  mines: Mine[];
  members: WorkspaceMember[];
  defaultValues?: {
    title?: string;
    status?: string;
    source_organization_id?: string | null;
    mine_id?: string | null;
    owner_user_id?: string | null;
    confidence?: number | null;
    available_from?: string | null;
    available_until?: string | null;
    source?: string | null;
    notes?: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "qualifying", label: "Qualifying" },
  { value: "qualified", label: "Qualified" },
  { value: "in_negotiation", label: "In Negotiation" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "committed", label: "Committed" },
  { value: "on_hold", label: "On Hold" },
  { value: "lost", label: "Lost" },
  { value: "closed", label: "Closed" },
];

export function OpportunityForm({
  mode,
  opportunityId,
  organizations,
  mines,
  members,
  defaultValues = {},
}: OpportunityFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const action =
    mode === "create"
      ? createOpportunityAction
      : updateOpportunityAction.bind(null, opportunityId!);

  const [state, formAction, isPending] = useActionState<
    OpportunityActionResult | null,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/* Error banner */}
      {state && !state.ok && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Success banner (edit mode) */}
      {state?.ok && mode === "edit" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Opportunity updated successfully.
        </div>
      )}

      {/* Core fields */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Opportunity Details</h2>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            defaultValue={defaultValues.title ?? ""}
            required
            placeholder="e.g. Copper concentrate — Lumwana Q1 2027"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>

        {/* Status + Confidence */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={defaultValues.status ?? "lead"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Confidence (0–100)
            </label>
            <input
              type="number"
              name="confidence"
              defaultValue={defaultValues.confidence ?? ""}
              min={0}
              max={100}
              placeholder="e.g. 75"
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>

        {/* Source Organisation + Mine */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Supplier / Producer
            </label>
            <select
              name="source_organization_id"
              defaultValue={defaultValues.source_organization_id ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">— None —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.legal_name}
                  {o.trading_name ? ` (${o.trading_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Mine
            </label>
            <select
              name="mine_id"
              defaultValue={defaultValues.mine_id ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">— None —</option>
              {mines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.country_code ? ` (${m.country_code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Owner */}
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Opportunity Owner
          </label>
          <select
            name="owner_user_id"
            defaultValue={defaultValues.owner_user_id ?? ""}
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_profiles?.display_name || "Workspace member"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Availability */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Availability Window</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Available From
            </label>
            <input
              type="date"
              name="available_from"
              defaultValue={defaultValues.available_from ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Available Until
            </label>
            <input
              type="date"
              name="available_until"
              defaultValue={defaultValues.available_until ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">
          Source & Notes
        </h2>
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Source / Origin Reference
          </label>
          <input
            type="text"
            name="source"
            defaultValue={defaultValues.source ?? ""}
            placeholder="e.g. field visit, broker referral"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Notes & Commercial Updates
          </label>
          <textarea
            name="notes"
            defaultValue={defaultValues.notes ?? ""}
            rows={4}
            placeholder="Commodity details, grade, quantity, delivery terms, pricing indications…"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          <GemIcon className="h-4 w-4" />
          {isPending
            ? mode === "create"
              ? "Saving…"
              : "Updating…"
            : mode === "create"
              ? "Save Opportunity"
              : "Update Opportunity"}
        </button>
        <Link
          href={
            mode === "edit" && opportunityId
              ? `/opportunities/${opportunityId}`
              : "/opportunities"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Cancel
        </Link>
      </div>
    </form>
  );
}
