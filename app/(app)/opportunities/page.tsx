import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { GemIcon, PlusIcon, SearchIcon, ChevronRightIcon, MapPinIcon, BuildingIcon } from "@/app/components/icons";

interface OpportunityRow {
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
  organizations?: { id: string; legal_name: string; trading_name: string | null }[] | null;
  mines?: { id: string; name: string; country_code: string | null }[] | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "qualified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "in_negotiation":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "committed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "lost":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "on_hold":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "closed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
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

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "").trim();

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  let query = supabase
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
      organizations (
        id,
        legal_name,
        trading_name
      ),
      mines (
        id,
        name,
        country_code
      )
    `)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: rawOpportunities } = await query;
  const allOpportunities = (rawOpportunities as unknown as OpportunityRow[]) ?? [];

  const filteredOpportunities = q
    ? allOpportunities.filter((o) => {
        const orgName = o.organizations?.[0]?.trading_name || o.organizations?.[0]?.legal_name || "";
        const mineName = o.mines?.[0]?.name || "";
        const text = `${o.title} ${o.status} ${orgName} ${mineName} ${o.source ?? ""} ${o.notes ?? ""}`.toLowerCase();
        return text.includes(q);
      })
    : allOpportunities;

  const totalCount = allOpportunities.length;
  const qualifiedCount = allOpportunities.filter((o) => o.status === "qualified").length;
  const inNegotiationCount = allOpportunities.filter((o) => o.status === "in_negotiation").length;

  const STATUS_FILTERS = [
    { value: "all", label: "All Statuses" },
    { value: "lead", label: "Lead" },
    { value: "qualifying", label: "Qualifying" },
    { value: "qualified", label: "Qualified" },
    { value: "in_negotiation", label: "In Negotiation" },
    { value: "awaiting_approval", label: "Awaiting Approval" },
    { value: "committed", label: "Committed" },
    { value: "on_hold", label: "On Hold" },
    { value: "lost", label: "Lost" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <GemIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Mineral Opportunities</h1>
            <p className="text-sm text-muted">Track and qualify mineral opportunities for sourcing.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-1 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search opportunities…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 pl-9 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Total Opportunities</p>
          <p className="text-2xl font-bold text-charcoal">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Qualified</p>
          <p className="text-2xl font-bold text-emerald-700">{qualifiedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">In Negotiation</p>
          <p className="text-2xl font-bold text-amber-700">{inNegotiationCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <a
            key={filter.value}
            href={`/opportunities?q=${encodeURIComponent(q)}&status=${filter.value}`}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-navy-900 border-navy-900 text-white"
                : "border-border bg-white text-charcoal hover:bg-workspace"
            }`}
          >
            {filter.label}
          </a>
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white/60 px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted">
              {q || statusFilter !== "all"
                ? "No opportunities match your search or filter."
                : "No mineral opportunities recorded yet."}
            </p>
            {!q && statusFilter === "all" && (
              <div className="mt-6">
                <Link
                  href="/opportunities/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  Record an Opportunity
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredOpportunities.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opp) => {
            const orgName =
              opp.organizations?.[0]?.trading_name || opp.organizations?.[0]?.legal_name || null;
            const mineName = opp.mines?.[0]?.name || null;
            const mineCountry = opp.mines?.[0]?.country_code || null;
            return (
              <Link
                key={opp.id}
                href={`/opportunities/${opp.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-navy-700 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-charcoal group-hover:text-navy-900">
                      {opp.title}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                        opp.status,
                      )}`}
                    >
                      {formatStatus(opp.status)}
                    </span>
                  </div>

                  {opp.confidence !== null && opp.confidence !== undefined && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                      <span className="font-medium">{opp.confidence}%</span>
                      <span>confidence</span>
                    </div>
                  )}

                  {orgName && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-charcoal">
                      <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="truncate font-medium">{orgName}</span>
                    </div>
                  )}

                  {mineName && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                      <span className="truncate">
                        {mineName}{mineCountry ? `, ${mineCountry}` : ""}
                      </span>
                    </div>
                  )}

                  {opp.available_from && (
                    <p className="mt-2 text-xs text-muted">
                      Available from{" "}
                      <span className="font-medium">
                        {new Date(opp.available_from).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
                  <span>
                    {new Date(opp.created_at).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-navy-900 group-hover:translate-x-0.5 transition-transform">
                    View <ChevronRightIcon className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filteredOpportunities.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted">
            {filteredOpportunities.length} of {totalCount} opportunity
            {totalCount !== 1 ? "s" : ""} displayed
          </p>
          <Link
            href="/opportunities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
          >
            <PlusIcon className="h-4 w-4" />
            Record an Opportunity
          </Link>
        </div>
      )}
    </div>
  );
}
