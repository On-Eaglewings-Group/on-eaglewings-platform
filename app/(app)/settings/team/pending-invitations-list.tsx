"use client";

import { useTransition } from "react";
import { revokeInvitationAction } from "@/app/actions/invitations";

interface Invitation {
  id: string;
  invited_email: string;
  role: string;
  invited_at: string;
  expires_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "admin": return "bg-purple-100 text-purple-800";
    case "manager": return "bg-blue-100 text-blue-800";
    case "contributor": return "bg-teal-100 text-teal-800";
    default: return "bg-zinc-100 text-zinc-700";
  }
}

export function PendingInvitationsList({ invitations }: { invitations: Invitation[] }) {
  const [pending, startTransition] = useTransition();

  function revoke(id: string) {
    startTransition(async () => {
      await revokeInvitationAction(id);
    });
  }

  return (
    <ul className="divide-y divide-border">
      {invitations.map((inv) => (
        <li key={inv.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{inv.invited_email}</p>
            <p className="mt-0.5 text-xs text-muted">
              Invited {formatDate(inv.invited_at)} · Expires {formatDate(inv.expires_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(inv.role)}`}>
              {inv.role}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => revoke(inv.id)}
              className="text-xs font-medium text-red-600 hover:underline disabled:cursor-wait disabled:opacity-50"
            >
              Revoke
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

