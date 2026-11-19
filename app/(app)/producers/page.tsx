import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  BuildingIcon,
  MineIcon,
  ChevronRightIcon,
} from "@/app/components/icons";

interface ProducerRow {
  id: string;
  legal_name: string;
  trading_name: string | null;
  country_code: string | null;
  registration_number: string | null;
  website_url: string | null;
  verification_status: string;
  created_at: string;
  producer_profiles?: {
    description: string | null;
    production_notes: string | null;
  } | null;
  mine_organization_roles?: Array<{
    id: string;
    role: string;
    mines: {
      id: string;
      name: string;
      country_code: string | null;
      region: string | null;
    } | null;
  }> | null;
  contact_organizations?: Array<{
    id: string;
    contacts: {
      id: string;
      full_name: string;
    } | null;
  }> | null;
}

function verificationBadge(status: string) {
  switch (status) {
    case "verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "in_review":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
    case "suspended":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default async function ProducersPage({
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
    .from("organizations")
    .select(`
      id,
      legal_name,
      trading_name,
      country_code,
      registration_number,
      website_url,
      verification_status,
      created_at,
      producer_profiles (
        description,
        production_notes
      ),
      mine_organization_roles (
        id,
        role,
        mines (
          id,
          name,
          country_code,
          region
        )
      ),
      contact_organizations (
        id,
        contacts (
          id,
          full_name
        )
      )
    `)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("verification_status", statusFilter);
  }
  if (countryFilter && countryFilter !== "all") {
    query = query.eq("country_code", countryFilter);
  }

  const { data: rawOrgs, error } = await query;
  // Filter for organizations that have a producer profile or producer role
  const allProducers = ((rawOrgs as unknown as ProducerRow[]) ?? []).filter(
    (org) =>
      org.producer_profiles !== null ||
      org.mine_organization_roles?.some((r) => r.role === "producer"),
  );

  const filteredProducers = q
    ? allProducers.filter((p) => {
        const text = `${p.legal_name} ${p.trading_name ?? ""} ${p.country_code ?? ""} ${p.registration_number ?? ""}`.toLowerCase();
        return text.includes(q);
      })
    : allProducers;

  const totalCount = allProducers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Producers Directory</h1>
            <p className="text-sm text-muted">
              {totalCount} registered {totalCount === 1 ? "producer" : "producers"} in the supply network
            </p>
          </div>
        </div>

        <Link
          href="/producers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" />
          Register Producer
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
              placeholder="Search company or trading name..."
              className="w-full rounded-lg border border-border bg-workspace/50 py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div>
            <select
              name="status"
              defaultValue={statusFilter || "all"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="all">All Verification Statuses</option>
              <option value="unverified">Unverified</option>
              <option value="in_review">In Review</option>
              <option value="verified">Verified</option>
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
                href="/producers"
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
          Failed to load producers: {error.message}
        </div>
      )}

      {/* Empty State */}
      {filteredProducers.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-800">
            <BuildingIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-charcoal">
            {allProducers.length === 0 ? "No producers registered yet" : "No producers match your filter"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {allProducers.length === 0
              ? "Register producing entities and suppliers to link them with mining operations."
              : "Try adjusting your search query or verification filter."}
          </p>
          <div className="mt-6">
            <Link
              href="/producers/new"
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              <PlusIcon className="h-4 w-4" />
              Add a Producer
            </Link>
          </div>
        </div>
      )}

      {/* Producers Grid */}
      {filteredProducers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducers.map((producer) => {
            const mineLinks = producer.mine_organization_roles ?? [];
            const contactCount = producer.contact_organizations?.length ?? 0;

            return (
              <Link
                key={producer.id}
                href={`/producers/${producer.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-navy-700 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-charcoal group-hover:text-navy-900 truncate">
                        {producer.trading_name || producer.legal_name}
                      </h2>
                      {producer.trading_name && (
                        <p className="text-xs text-muted truncate">{producer.legal_name}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${verificationBadge(
                        producer.verification_status,
                      )}`}
                    >
                      {producer.verification_status.replace("_", " ")}
                    </span>
                  </div>

                  {producer.country_code && (
                    <div className="mt-2.5 flex items-center gap-1 text-xs text-muted">
                      <span className="font-medium text-charcoal">Origin:</span> {producer.country_code}
                      {producer.registration_number && ` • Reg: ${producer.registration_number}`}
                    </div>
                  )}

                  {producer.producer_profiles?.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted">
                      {producer.producer_profiles.description}
                    </p>
                  )}

                  {/* Linked Mines */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mineLinks.length > 0 ? (
                      mineLinks.map((ml) => (
                        <span
                          key={ml.id}
                          className="inline-flex items-center gap-1 rounded-md bg-workspace px-2 py-0.5 text-[11px] font-medium text-charcoal"
                        >
                          <MineIcon className="h-3 w-3 text-navy-700" />
                          {ml.mines?.name || "Mine"}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted italic">No linked mines</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5 text-navy-700" />
                    {contactCount} {contactCount === 1 ? "contact" : "contacts"}
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
    </div>
  );
}
