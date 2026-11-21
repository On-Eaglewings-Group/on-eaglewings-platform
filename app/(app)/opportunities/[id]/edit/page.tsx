import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { OpportunityForm } from "@/app/(app)/opportunities/components/opportunity-form";
import { firstRelation } from "@/lib/relations";
import { ArrowLeftIcon } from "@/app/components/icons";

interface OpportunityForForm {
  id: string;
  title: string;
  status: string;
  source_organization_id: string | null;
  mine_id: string | null;
  owner_user_id: string | null;
  confidence: number | null;
  available_from: string | null;
  available_until: string | null;
  source: string | null;
  notes: string | null;
}

export default async function OpportunityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  const { data: opportunity, error } = await supabase
    .from("mineral_opportunities")
    .select("id, title, status, source_organization_id, mine_id, owner_user_id, confidence, available_from, available_until, source, notes")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (error || !opportunity) {
    notFound();
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12l-1 4L12 13L5 7z" />
              <path d="M18 3v6" />
              <path d="M6 21v-6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Edit Opportunity</h1>
            <p className="text-sm text-muted">Modify opportunity details and commercial terms.</p>
          </div>
        </div>

        <Link
          href={`/opportunities/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Opportunity
        </Link>
      </div>

      <div className="max-w-2xl">
        <OpportunityForm
          mode="edit"
          opportunityId={id}
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
          defaultValues={{
            title: opportunity.title,
            status: opportunity.status,
            source_organization_id: opportunity.source_organization_id,
            mine_id: opportunity.mine_id,
            owner_user_id: opportunity.owner_user_id,
            confidence: opportunity.confidence,
            available_from: opportunity.available_from,
            available_until: opportunity.available_until,
            source: opportunity.source,
            notes: opportunity.notes,
          }}
        />
      </div>
    </div>
  );
}