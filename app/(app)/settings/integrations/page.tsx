import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkDocumentStorage } from "@/app/actions/documents";
import { SettingsIcon } from "@/app/components/icons";

export default async function SettingsIntegrationsPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed") redirect("/access-denied");

  const storage = await checkDocumentStorage();

  const rows = [
    {
      name: "Authentication",
      status: "Connected",
      detail: "Sign-in uses Supabase Auth with Google OAuth. There is no separate integration switch to configure.",
    },
    {
      name: "Workspace database",
      status: "Connected",
      detail: "Records are stored in the workspace Supabase PostgreSQL project and protected by row-level security.",
    },
    {
      name: "Document storage",
      status: storage.ok ? "Reachable" : "Not ready",
      detail: storage.ok
        ? "The private workspace-documents bucket accepted a storage listing for this session."
        : storage.error ?? "Document storage could not be reached.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Integrations</h1>
          <p className="text-sm text-muted">Services this workspace actually uses. Email, calendar and CRM connectors are not configured.</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-3">
        {rows.map((row) => (
          <div key={row.name} className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-charcoal">{row.name}</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{row.status}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{row.detail}</p>
          </div>
        ))}
      </div>

      <Link href="/settings" className="inline-flex text-sm font-medium text-charcoal hover:underline">
        Back to Settings
      </Link>
    </div>
  );
}
