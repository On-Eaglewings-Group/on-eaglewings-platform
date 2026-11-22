import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ClipboardIcon, PlusIcon, SearchIcon, ChevronRightIcon, BuildingIcon, CalendarIcon } from "@/app/components/icons";

interface RequirementRow {
  id: string;
  title: string;
  status: string;
  buyer_organization_id: string | null;
  owner_user_id: string | null;
  target_delivery_from: string | null;
  target_delivery_until: string | null;
  delivery_country_code: string | null;
  incoterm: string | null;
  currency_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  organizations?: { id: string; legal_name: string; trading_name: string | null }[] | null;
  requirement_lines?: Array<{
    id: string;
    commodity_id: string;
    quantity_min: number | null;
    quantity_max: number | null;
    unit_code: string | null;
  }> | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "qualified": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "sourcing": return "bg-amber-50 text-amber-700 border-amber-200";
    case "matched": return "bg-blue-50 text-blue-700 border-blue-200";
    case "fulfilled": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "on_hold": return "bg-amber-100 text-amber-800 border-amber-200";
    case "closed": return "bg-slate-100 text-slate-700 border-slate-200";
    case "cancelled": return "bg-slate-100 text-slate-700 border-slate-200";
    default: return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "lead": return "Lead";
    case "qualifying": return "Qualifying";
    case "qualified": return "Qualified";
    case "sourcing": return "Sourcing";
    case "matched": return "Matched";
    case "fulfilled": return "Fulfilled";
    case "on_hold": return "On Hold";
    case "closed": return "Closed";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

export default async function BuyerRequirementsPage({
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
    .from("buyer_requirements")
    .select(`
      id,
      title,
      status,
      buyer_organization_id,
      owner_user_id,
      target_delivery_from,
      target_delivery_until,
      delivery_country_code,
      incoterm,
      currency_code,
      notes,
      created_at,
      updated_at,
      organizations (
        id,
        legal_name,
        trading_name
      ),
      requirement_lines (
        id,
        commodity_id,
        quantity_min,
        quantity_max,
        unit_code
      )
    `)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: rawRequirements } = await query;
  const allRequirements = (rawRequirements as unknown as RequirementRow[]) ?? [];

  const filteredRequirements = q
    ? allRequirements.filter((r) => {
        const orgName = r.organizations?.[0]?.trading_name || r.organizations?.[0]?.legal_name || "";
        const text = `${r.title} ${r.status} ${orgName} ${r.incoterm ?? ""} ${r.currency_code ?? ""} ${r.notes ?? ""}`.toLowerCase();
        return text.includes(q);
      })
    : allRequirements;

  const totalCount = allRequirements.length;
  const qualifiedCount = allRequirements.filter((r) => r.status === "qualified").length;
  const sourcingCount = allRequirements.filter((r) => r.status === "sourcing").length;

  const STATUS_FILTERS = [
    { value: "all", label: "All Statuses" },
    { value: "lead", label: "Lead" },
    { value: "qualifying", label: "Qualifying" },
    { value: "qualified", label: "Qualified" },
    { value: "sourcing", label: "Sourcing" },
    { value: "matched", label: "Matched" },
    { value: "fulfilled", label: "Fulfilled" },
    { value: "on_hold", label: "On Hold" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <ClipboardIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Buyer Requirements</h1>
            <p className="text-sm text-muted">Manage buyer requirements and commercial needs.</p>
<div className="mt-3">
  <Link
    href="/buyer-requirements/new"
    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
    <PlusIcon className="h-4 w-4" />
    Add a Buyer Requirement
  </Link>
</div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-1 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search requirements…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 pl-9 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Total Requirements</p>
          <p className="text-2xl font-bold text-charcoal">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Qualified</p>
          <p className="text-2xl font-bold text-emerald-700">{qualifiedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Sourcing</p>
          <p className="text-2xl font-bold text-amber-700">{sourcingCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <a
            key={filter.value}
            href={`/buyer-requirements?q=${encodeURIComponent(q)}&status=${filter.value}`}
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

      {filteredRequirements.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white/60 px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted">
              {q || statusFilter !== "all"
                ? "No buyer requirements match your search or filter."
                : "No buyer requirements recorded yet."}
            </p>
            {!q && statusFilter === "all" && (
              <div className="mt-6">
                <Link
                  href="/buyer-requirements/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add a Buyer Requirement
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredRequirements.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequirements.map((req) => {
            const orgName =
              req.organizations?.[0]?.trading_name || req.organizations?.[0]?.legal_name || null;
            const lines = req.requirement_lines ?? [];
            const commodityCount = lines.length;
            return (
              <Link
                key={req.id}
                href={`/buyer-requirements/${req.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-navy-700 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-charcoal group-hover:text-navy-900 truncate">
                      {req.title}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                        req.status,
                      )}`}
                    >
                      {formatStatus(req.status)}
                    </span>
                  </div>

                  {orgName && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-charcoal">
                      <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="truncate font-medium">{orgName}</span>
                    </div>
                  )}

                  {commodityCount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                      <span>{commodityCount} commodity line{commodityCount !== 1 ? "s" : ""}</span>
                    </div>
                  )}

                  {req.target_delivery_from && (
                    <p className="mt-2 text-xs text-muted">
                      Delivery from{" "}
                      <span className="font-medium">
                        {new Date(req.target_delivery_from).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
                  <span>
                    {new Date(req.created_at).toLocaleDateString()}
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

      {filteredRequirements.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted">
            {filteredRequirements.length} of {totalCount} requirement
            {totalCount !== 1 ? "s" : ""} displayed
          </p>
          <Link
            href="/buyer-requirements/new"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
          >
            <PlusIcon className="h-4 w-4" />
            Add a Buyer Requirement
          </Link>
        </div>
      )}
    </div>
  );
}