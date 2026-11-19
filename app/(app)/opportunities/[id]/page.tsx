import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ArrowLeftIcon, PencilIcon, GemIcon } from "@/app/components/icons";

interface OpportunityDetail {
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
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  organizations?: { id: string; legal_name: string; trading_name: string | null } | null;
  mines?: { id: string; name: string; country_code: string | null; region: string | null; locality: string | null } | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "qualified": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "in_negotiation": return "bg-amber-50 text-amber-700 border-amber-200";
    case "committed": return "bg-blue-50 text-blue-700 border-blue-200";
    case "lost": return "bg-slate-100 text-slate-700 border-slate-200";
    case "on_hold": return "bg-amber-100 text-amber-800 border-amber-200";
    case "closed": return "bg-slate-100 text-slate-700 border-slate-200";
    default: return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "lead": return "Lead";
    case "qualifying": return "Qualifying";
    case "qualified": return "Qualified";
    case "in_negotiation": return "In Negotiation";
    case "awaiting_approval": return "Awaiting Approval";
    case "committed": return "Committed";
    case "lost": return "Lost";
    case "on_hold": return "On Hold";
    case "closed": return "Closed";
    default: return status;
  }
}

export default async function OpportunityDetailPage({
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
    .select(`
      id,
      title,
      status,
      source_organization_id,
      mine_id,
      owner_user_id,
      confidence,
      available_from,
      available_until,
      source,
      notes,
      created_at,
      updated_at,
      archived_at,
      organizations (
        id,
        legal_name,
        trading_name
      ),
      mines (
        id,
        name,
        country_code,
        region,
        locality
      )
    `)
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (error || !opportunity) {
    notFound();
  }

  const canEdit =
    access.role === "owner" ||
    access.role === "admin" ||
    access.role === "manager" ||
    access.role === "contributor";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <GemIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">{opportunity.title}</h1>
            <p className="text-sm text-muted">Mineral opportunity details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/opportunities"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to Opportunities
          </Link>
          {canEdit && (
            <Link
              href={`/opportunities/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                    opportunity.status,
                  )}`}
                >
                  {formatStatus(opportunity.status)}
                </span>
                {opportunity.confidence !== null && opportunity.confidence !== undefined && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted">
                    {opportunity.confidence}% confidence
                  </span>
                )}
              </div>
              <div className="text-right text-xs text-muted">
                <p>Updated {new Date(opportunity.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
            <h2 className="mt-2 text-xl font-bold text-charcoal">{opportunity.title}</h2>
            {opportunity.source && (
              <p className="mt-1 text-sm text-muted">Source: {opportunity.source}</p>
            )}
            {opportunity.notes && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Notes</h3>
                <p className="mt-1 text-sm text-charcoal whitespace-pre-line">{opportunity.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Source & Location</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted">Source Organization</p>
                <p className="text-sm text-charcoal">
                  {opportunity.organizations?.[0]?.trading_name || opportunity.organizations?.[0]?.legal_name || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Mine</p>
                <p className="text-sm text-charcoal">
                  {opportunity.mines?.[0]?.name || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Mine Location</p>
                <p className="text-sm text-charcoal">
                  {opportunity.mines?.[0]?.region || opportunity.mines?.[0]?.locality || opportunity.mines?.[0]?.country_code || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Availability</p>
                <p className="text-sm text-charcoal">
                  {opportunity.available_from
                    ? `From ${new Date(opportunity.available_from).toLocaleDateString()}`
                    : "Not specified"}
                  {opportunity.available_until
                    ? ` to ${new Date(opportunity.available_until).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Status</span>
                <span className="text-sm font-medium text-charcoal capitalize">{formatStatus(opportunity.status)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Created</span>
                <span className="text-sm font-medium text-charcoal">{new Date(opportunity.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Owner</span>
                <span className="text-sm font-medium text-charcoal">{opportunity.owner_user_id || "Not assigned"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-2">
              {canEdit && (
                <Link
                  href={`/opportunities/${id}/edit`}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Opportunity
                </Link>
              )}
              <Link
                href="/opportunities"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}