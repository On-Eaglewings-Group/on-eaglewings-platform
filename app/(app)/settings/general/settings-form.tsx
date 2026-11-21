"use client";

import { useActionState } from "react";
import { updateWorkspaceSettingsAction, type SettingsActionResult } from "@/app/actions/settings";

const TIMEZONES = [
  "UTC",
  "Africa/Johannesburg",
  "Africa/Lusaka",
  "Africa/Kinshasa",
  "Africa/Harare",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
];

export function WorkspaceSettingsForm({
  canEdit,
  name,
  currency,
  timezone,
}: {
  canEdit: boolean;
  name: string;
  currency: string;
  timezone: string;
}) {
  const [state, action, pending] = useActionState<SettingsActionResult | null, FormData>(
    updateWorkspaceSettingsAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Workspace settings saved.
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-charcoal" htmlFor="name">Workspace name</label>
        <input id="name" name="name" defaultValue={name} required disabled={!canEdit} className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal disabled:opacity-70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal" htmlFor="default_currency">Default currency</label>
          <input id="default_currency" name="default_currency" defaultValue={currency} maxLength={3} required disabled={!canEdit} className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm uppercase text-charcoal disabled:opacity-70" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal" htmlFor="timezone">Timezone</label>
          <select id="timezone" name="timezone" defaultValue={TIMEZONES.includes(timezone) ? timezone : "UTC"} disabled={!canEdit} className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal disabled:opacity-70">
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
      </div>
      {canEdit ? (
        <button type="submit" disabled={pending} className="rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
      ) : (
        <p className="text-sm text-muted">Only owners and administrators can change these settings.</p>
      )}
    </form>
  );
}