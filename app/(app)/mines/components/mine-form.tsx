"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createMineAction, type MineActionResult } from "@/app/actions/mines";

interface MineFormProps {
  organizations: Array<{ id: string; legal_name: string; trading_name: string | null }>;
}

const initialState: MineActionResult = { ok: false };

export function MineForm({ organizations }: MineFormProps) {
  const [state, formAction, isPending] = useActionState(createMineAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Basic Information */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Mine Identification</h2>
        <p className="mt-1 text-xs text-muted">Primary commercial and registry names.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-xs font-medium text-charcoal">
              Mine Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="e.g. Kansanshi Copper Mine"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-medium text-charcoal">
              Operational Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="unverified"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="unverified">Unverified</option>
              <option value="operating">Operating / Active</option>
              <option value="care_and_maintenance">Care & Maintenance</option>
              <option value="closed">Closed</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label htmlFor="external_reference" className="block text-xs font-medium text-charcoal">
              Cadastre / License Ref
            </label>
            <input
              type="text"
              id="external_reference"
              name="external_reference"
              placeholder="e.g. ML-12849/2022"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Geographical Location */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Geographical Location</h2>
        <p className="mt-1 text-xs text-muted">Country, province, locality and GPS coordinates.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="country_code" className="block text-xs font-medium text-charcoal">
              Country (2-Letter ISO)
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
            <label htmlFor="region" className="block text-xs font-medium text-charcoal">
              Region / Province
            </label>
            <input
              type="text"
              id="region"
              name="region"
              placeholder="e.g. Copperbelt Province"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="locality" className="block text-xs font-medium text-charcoal">
              Locality / District
            </label>
            <input
              type="text"
              id="locality"
              name="locality"
              placeholder="e.g. Solwezi"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="latitude" className="block text-xs font-medium text-charcoal">
              Latitude (Decimal)
            </label>
            <input
              type="number"
              step="any"
              id="latitude"
              name="latitude"
              placeholder="e.g. -12.1834"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <label htmlFor="longitude" className="block text-xs font-medium text-charcoal">
              Longitude (Decimal)
            </label>
            <input
              type="number"
              step="any"
              id="longitude"
              name="longitude"
              placeholder="e.g. 26.3981"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-3">
            <p className="text-xs text-muted">
              Note: If coordinates are provided, both latitude and longitude are required.
            </p>
          </div>
        </div>
      </div>

      {/* Operator & Notes */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-charcoal">Operator & Commercial Context</h2>
        <p className="mt-1 text-xs text-muted">Assign an operating organization and commercial notes.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="operator_organization_id" className="block text-xs font-medium text-charcoal">
              Associated Organization (Optional)
            </label>
            <select
              id="operator_organization_id"
              name="operator_organization_id"
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
            <label htmlFor="operator_role" className="block text-xs font-medium text-charcoal">
              Organization Role
            </label>
            <select
              id="operator_role"
              name="operator_role"
              defaultValue="operator"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="operator">Mine Operator</option>
              <option value="owner">Mine Owner</option>
              <option value="producer">Producer / Offtaker</option>
              <option value="associated">Associated Partner</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="source" className="block text-xs font-medium text-charcoal">
              Information Source
            </label>
            <input
              type="text"
              id="source"
              name="source"
              placeholder="e.g. Ministry of Mines Geological Survey, Company Disclosure"
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-xs font-medium text-charcoal">
              Commercial & Operational Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Add ore types, estimated reserve scale, infrastructure access, or power supply notes..."
              className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/mines"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-50"
        >
          {isPending ? "Registering..." : "Save Mine to Registry"}
        </button>
      </div>
    </form>
  );
}
