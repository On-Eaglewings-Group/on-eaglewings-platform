import Link from "next/link";
import { SettingsIcon, UsersIcon } from "@/app/components/icons";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Settings</h1>
          <p className="text-sm text-muted">Workspace configuration, connected services and team access.</p>
        </div>
      </div>

      <div className="grid max-w-3xl gap-3">
        <Link href="/settings/general" className="rounded-xl border border-border bg-white p-5 shadow-sm hover:border-navy-900">
          <p className="text-sm font-semibold text-charcoal">General</p>
          <p className="mt-1 text-sm text-muted">Name, default currency and timezone.</p>
        </Link>
        <Link href="/settings/integrations" className="rounded-xl border border-border bg-white p-5 shadow-sm hover:border-navy-900">
          <p className="text-sm font-semibold text-charcoal">Integrations</p>
          <p className="mt-1 text-sm text-muted">Authentication, database and document storage status.</p>
        </Link>
        <Link href="/settings/team" className="rounded-xl border border-border bg-white p-5 shadow-sm hover:border-navy-900">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal">
            <UsersIcon className="h-4 w-4" />
            Team and invitations
          </p>
          <p className="mt-1 text-sm text-muted">Members, roles and pending invitations.</p>
        </Link>
      </div>
    </div>
  );
}
