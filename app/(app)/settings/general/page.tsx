import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { SettingsIcon } from "@/app/components/icons";
import { WorkspaceSettingsForm } from "./settings-form";

export default async function SettingsGeneralPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("name, default_currency, timezone")
    .eq("id", access.workspaceId)
    .single();

  const canEdit = access.role === "owner" || access.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">General Settings</h1>
          <p className="text-sm text-muted">Workspace name, default currency and timezone.</p>
        </div>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-white p-6 shadow-sm">
        {error || !workspace ? (
          <p className="text-sm text-red-800">Workspace settings could not be loaded.</p>
        ) : (
          <WorkspaceSettingsForm
            canEdit={canEdit}
            name={workspace.name}
            currency={workspace.default_currency}
            timezone={workspace.timezone}
          />
        )}
      </div>

      <Link href="/settings" className="inline-flex text-sm font-medium text-charcoal hover:underline">
        Back to Settings
      </Link>
    </div>
  );
}
