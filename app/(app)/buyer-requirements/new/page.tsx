import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { RequirementForm } from "@/app/(app)/buyer-requirements/components/requirement-form";
import { ClipboardIcon, ArrowLeftIcon } from "@/app/components/icons";

export default async function BuyerRequirementsNewPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  // Fetch organizations for the form selector
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, legal_name, trading_name")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("legal_name", { ascending: true });

  // Fetch commodities for the form selector
  const { data: commodities } = await supabase
    .from("commodities")
    .select("id, code, name")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("code", { ascending: true });

  // Fetch workspace members for owner selector
  const { data: members } = await supabase
    .from("workspace_memberships")
    .select("user_id, user_profiles(full_name, email)")
    .eq("workspace_id", access.workspaceId)
    .eq("status", "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <ClipboardIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Add a Buyer Requirement</h1>
          <p className="text-sm text-muted">Capture a buyer requirement and its specifications.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <RequirementForm
          mode="create"
          organizations={(organizations ?? []).map((o) => ({
            id: o.id,
            legal_name: o.legal_name,
            trading_name: o.trading_name,
          }))}
          commodities={(commodities ?? []).map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
          }))}
          members={(members ?? []).map((m) => ({
            user_id: m.user_id,
            user_profiles: m.user_profiles?.[0] ?? null,
          }))}
        />
      </div>

      <div className="mt-6">
        <Link
          href="/buyer-requirements"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Buyer Requirements
        </Link>
      </div>
    </div>
  );
}
