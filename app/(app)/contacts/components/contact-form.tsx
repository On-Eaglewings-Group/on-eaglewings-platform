"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createContactAction, type ContactActionResult } from "@/app/actions/contacts";

interface ContactFormProps {
  organizations: Array<{ id: string; legal_name: string; trading_name: string | null }>;
}

const initialState: ContactActionResult = { ok: false };

export function ContactForm({ organizations }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(createContactAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Primary Details */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Contact Details</h2>
        <p className="mt-1 text-xs text-muted">Individual identity, role, and commercial communication info.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className="block text-xs font-medium text-charcoal">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              placeholder="e.g. Tendai Chikwanha"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="job_title" className="block text-xs font-medium text-charcoal">
              Job Title / Designation
            </label>
            <input
              type="text"
              id="job_title"
              name="job_title"
              placeholder="e.g. Commercial Director / Mine Manager"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-medium text-charcoal">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="active"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-charcoal">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="t.chikwanha@example.com"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-charcoal">
              Phone / Mobile (with country code)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+260 97 1234567"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Organization Affiliation */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Organizational Affiliation</h2>
        <p className="mt-1 text-xs text-muted">Link this contact to a mining entity, producer, or commercial partner.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="organization_id" className="block text-xs font-medium text-charcoal">
              Primary Organization
            </label>
            <select
              id="organization_id"
              name="organization_id"
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">-- No organization linked initially --</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.trading_name ? `${org.trading_name} (${org.legal_name})` : org.legal_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="organization_role" className="block text-xs font-medium text-charcoal">
              Role at Organization (Optional)
            </label>
            <input
              type="text"
              id="organization_role"
              name="organization_role"
              placeholder="Leave blank to use Job Title"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_primary"
                defaultChecked
                className="h-4 w-4 rounded border-border text-navy-900 focus:ring-navy-900"
              />
              <span className="text-xs font-medium text-charcoal">
                Mark as primary contact for this organization
              </span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-xs font-medium text-charcoal">
              Commercial & Relationship Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Background, preferred communications channel, negotiation history..."
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/contacts"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-50"
        >
          {isPending ? "Adding Contact..." : "Save Contact"}
        </button>
      </div>
    </form>
  );
}
