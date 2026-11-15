import Link from "next/link";
import { FileIcon, SettingsIcon, UsersIcon } from "@/app/components/icons";

export default function SettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Settings</h1>
          <p className="text-sm text-muted">Configure platform and administrative settings.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileIcon className="h-4 w-4" />
          <p className="text-sm">Settings will be configured once the platform is initialised.</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          This area will hold general settings, notification preferences, integration configuration, and user administration.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/settings/general"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
          >
            General Settings
          </Link>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
          >
            Integrations
          </Link>
          <Link
            href="/settings/team"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
          >
            <UsersIcon className="h-4 w-4" />
            Team &amp; Invitations
          </Link>
        </div>
      </div>
    </div>
  );
}
