import Link from "next/link";
import { FileIcon, SettingsIcon } from "@/app/components/icons";

export default function SettingsGeneralPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">General Settings</h1>
          <p className="text-sm text-muted">Configure platform-wide settings.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileIcon className="h-4 w-4" />
          <p className="text-sm">Settings not yet configured.</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          General settings will include platform name, branding, default currency, time zone, and application preferences.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
        >
          Back to Settings
        </Link>
      </div>
    </div>
  );
}
