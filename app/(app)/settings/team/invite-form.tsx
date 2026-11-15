"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteUserAction, type InviteActionResult } from "@/app/actions/invitations";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "contributor", label: "Contributor" },
  { value: "viewer", label: "Viewer" },
] as const;

const initialState: InviteActionResult = { ok: false };

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUserAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-charcoal">
            Email address
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="colleague@example.com"
            className="w-full rounded-lg border border-border bg-workspace px-3 py-2.5 text-sm text-charcoal placeholder:text-muted focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-800/20"
          />
        </div>

        <div className="w-full sm:w-44">
          <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-charcoal">
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            required
            defaultValue="contributor"
            className="w-full rounded-lg border border-border bg-workspace px-3 py-2.5 text-sm text-charcoal focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-800/20"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Sending…" : "Send invitation"}
        </button>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Invitation sent. The user will gain access after signing in with this Google account.
        </p>
      )}
    </form>
  );
}

