"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProducerAction, type ProducerActionResult } from "@/app/actions/producers";

interface ProducerFormProps {
  mines: Array<{ id: string; name: string; country_code: string | null; region: string | null }>;
}

const initialState: ProducerActionResult = { ok: false };

export function ProducerForm({ mines }: ProducerFormProps) {
  const [state, formAction, isPending] = useActionState(createProducerAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Corporate Entity Details */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Corporate Entity Details</h2>
        <p className="mt-1 text-xs text-muted">Legal entity registration and commercial identity.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="legal_name" className="block text-xs font-medium text-charcoal">
              Legal Registered Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="legal_name"
              name="legal_name"
              required
              placeholder="e.g. Zambian Mineral Resources Limited"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="trading_name" className="block text-xs font-medium text-charcoal">
              Trading / Commercial Name (Optional)
            </label>
            <input
              type="text"
              id="trading_name"
              name="trading_name"
              placeholder="e.g. ZMR Minerals"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="country_code" className="block text-xs font-medium text-charcoal">
              Country of Incorporation (2-Letter ISO)
            </label>
            <input
              type="text"
              id="country_code"
              name="country_code"
              maxLength={2}
              placeholder="e.g. ZM, CD, ZA"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm uppercase text-charcoal placeholder:normal-case placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="registration_number" className="block text-xs font-medium text-charcoal">
              Company Registration / Tax Number
            </label>
            <input
              type="text"
              id="registration_number"
              name="registration_number"
              placeholder="e.g. CR-894210"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="website_url" className="block text-xs font-medium text-charcoal">
              Website or Corporate Portal URL
            </label>
            <input
              type="url"
              id="website_url"
              name="website_url"
              placeholder="https://example-minerals.com"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Production Profile & Capacity */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Production Profile & Operational Context</h2>
        <p className="mt-1 text-xs text-muted">Commodities supplied, processing capabilities, and mine associations.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="mine_id" className="block text-xs font-medium text-charcoal">
              Associate with Existing Mine (Optional)
            </label>
            <select
              id="mine_id"
              name="mine_id"
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">-- No initial mine link --</option>
              {mines.map((mine) => (
                <option key={mine.id} value={mine.id}>
                  {mine.name} {mine.country_code ? `(${mine.country_code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-xs font-medium text-charcoal">
              Producer Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Brief summary of the producing entity, track record, and commercial focus..."
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="production_notes" className="block text-xs font-medium text-charcoal">
              Production Capacity & Export Readiness
            </label>
            <textarea
              id="production_notes"
              name="production_notes"
              rows={3}
              placeholder="e.g. Monthly concentrate capacity ~1,500 MT, grade 26-28% Cu. Export permits in place for Dar es Salaam corridor..."
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-xs font-medium text-charcoal">
              Internal Commercial Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Confidential management notes, banking references or background..."
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/producers"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-50"
        >
          {isPending ? "Registering..." : "Save Producer"}
        </button>
      </div>
    </form>
  );
}
