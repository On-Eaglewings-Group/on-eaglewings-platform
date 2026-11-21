import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { OpportunityForm } from "@/app/(app)/opportunities/components/opportunity-form";
import { firstRelation } from "@/lib/relations";
import { GemIcon, ArrowLeftIcon } from "@/app/components/icons";

export default async function OpportunitiesNewPage() {
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

  // Fetch mines for the form selector
  const { data: mines } = await supabase
    .from("mines")
    .select("id, name, country_code")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  // Fetch workspace members for owner selector
  const { data: members } = await supabase
    .from("workspace_memberships")
    .select("user_id, user_profiles(display_name)")
    .eq("workspace_id", access.workspaceId)
    .eq("status", "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <GemIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Record an Opportunity</h1>
          <p className="text-sm text-muted">Log a mineral opportunity for assessment.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <OpportunityForm
          mode="create"
          organizations={(organizations ?? []).map((o) => ({
            id: o.id,
            legal_name: o.legal_name,
            trading_name: o.trading_name,
          }))}
          mines={(mines ?? []).map((m) => ({
            id: m.id,
            name: m.name,
            country_code: m.country_code,
          }))}
          members={(members ?? []).map((m) => ({
            user_id: m.user_id,
            user_profiles: firstRelation(
              m.user_profiles as { display_name: string | null } | { display_name: string | null }[] | null,
            ),
          }))}
        />
      </div>

      <div className="mt-6">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Mineral Opportunities
        </Link>
      </div>
    </div>
  );
}
