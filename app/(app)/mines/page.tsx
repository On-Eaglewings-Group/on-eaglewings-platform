import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  MineIcon,
  PlusIcon,
  SearchIcon,
  MapPinIcon,
  BuildingIcon,
  ChevronRightIcon,
} from "@/app/components/icons";

interface MineRow {
  id: string;
  name: string;
  country_code: string | null;
  region: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  mine_organization_roles?: Array<{
    id: string;
    role: string;
    organizations: {
      id: string;
      legal_name: string;
      trading_name: string | null;
    } | null;
  }> | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "operating":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "care_and_maintenance":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "closed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "care_and_maintenance":
      return "Care & Maint.";
    case "operating":
      return "Operating";
    case "closed":
      return "Closed";
    default:
      return "Unverified";
  }
}

export default async function MinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; country?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "").trim();
  const countryFilter = (params.country ?? "").trim().toUpperCase();

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  let query = supabase
    .from("mines")
    .select(`
      id,
      name,
      country_code,
      region,
      locality,
      latitude,
      longitude,
      status,
      created_at,
      mine_organization_roles (
        id,
        role,
        organizations (
          id,
          legal_name,
          trading_name
        )
      )
    `)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (countryFilter && countryFilter !== "all") {
    query = query.eq("country_code", countryFilter);
  }

  const { data: rawMines, error } = await query;
  const allMines = (rawMines as unknown as MineRow[]) ?? [];

  const filteredMines = q
    ? allMines.filter((m) => {
        const text = `${m.name} ${m.region ?? ""} ${m.locality ?? ""} ${m.country_code ?? ""}`.toLowerCase();
        return text.includes(q);
      })
    : allMines;

  const operatingCount = allMines.filter((m) => m.status === "operating").length;
  const totalCount = allMines.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <MineIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Mines Registry</h1>
            <p className="text-sm text-muted">
              {totalCount} registered {totalCount === 1 ? "mine" : "mines"} ({operatingCount} active/operating)
            </p>
          </div>
        </div>

        <Link
          href="/mines/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" />
          Register Mine
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <form method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search by name, region or location..."
              className="w-full rounded-lg border border-border bg-workspace/50 py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <select
              name="status"
              defaultValue={statusFilter || "all"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="all">All Statuses</option>
              <option value="operating">Operating</option>
              <option value="care_and_maintenance">Care & Maintenance</option>
              <option value="closed">Closed</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              name="country"
              defaultValue={params.country ?? ""}
              maxLength={2}
              placeholder="Country ISO (e.g. ZM)"
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal uppercase placeholder:normal-case placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
            <button
              type="submit"
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
            >
              Filter
            </button>
            {(q || statusFilter || countryFilter) && (
              <Link
                href="/mines"
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-workspace"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load mines registry: {error.message}
        </div>
      )}

      {/* Empty State */}
      {filteredMines.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-800">
            <MineIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-charcoal">
            {allMines.length === 0 ? "No mines registered yet" : "No mines match your filter"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {allMines.length === 0
              ? "Get started by adding your first commercial mining property to the registry."
              : "Try clearing your search query or status filter to see other mines."}
          </p>
          <div className="mt-6">
            <Link
              href="/mines/new"
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              <PlusIcon className="h-4 w-4" />
              Add a Mine
            </Link>
          </div>
        </div>
      )}

      {/* Mine List */}
      {filteredMines.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMines.map((mine) => {
            const operatorRole = mine.mine_organization_roles?.find(
              (r) => r.role === "operator" || r.role === "owner" || r.role === "producer",
            );
            const operatorName =
              operatorRole?.organizations?.trading_name ||
              operatorRole?.organizations?.legal_name ||
              null;

            return (
              <Link
                key={mine.id}
                href={`/mines/${mine.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-navy-700 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-charcoal group-hover:text-navy-900">
                      {mine.name}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                        mine.status,
                      )}`}
                    >
                      {formatStatus(mine.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                    <span>
                      {[mine.locality, mine.region, mine.country_code].filter(Boolean).join(", ") || "Location unrecorded"}
                    </span>
                  </div>

                  {operatorName && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-charcoal">
                      <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="font-medium">{operatorName}</span>
                    </div>
                  )}

                  {mine.latitude !== null && mine.longitude !== null && (
                    <p className="mt-2 font-mono text-[11px] text-muted">
                      Coords: {mine.latitude.toFixed(4)}, {mine.longitude.toFixed(4)}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
                  <span>Registered {new Date(mine.created_at).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-navy-900 group-hover:translate-x-0.5 transition-transform">
                    View <ChevronRightIcon className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
