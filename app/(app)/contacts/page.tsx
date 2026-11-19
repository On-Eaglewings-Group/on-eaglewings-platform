import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  ChevronRightIcon,
} from "@/app/components/icons";

interface ContactRow {
  id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  contact_organizations?: Array<{
    id: string;
    role: string | null;
    is_primary: boolean;
    organizations: {
      id: string;
      legal_name: string;
      trading_name: string | null;
      country_code: string | null;
    } | null;
  }> | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "inactive":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export default async function ContactsPage({
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
    .from("contacts")
    .select(`
      id,
      full_name,
      job_title,
      email,
      phone,
      status,
      created_at,
      contact_organizations (
        id,
        role,
        is_primary,
        organizations (
          id,
          legal_name,
          trading_name,
          country_code
        )
      )
    `)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: rawContacts, error } = await query;
  const allContacts = (rawContacts as unknown as ContactRow[]) ?? [];

  const filteredContacts = q
    ? allContacts.filter((c) => {
        const orgNames = (c.contact_organizations ?? [])
          .map((co) => `${co.organizations?.legal_name} ${co.organizations?.trading_name ?? ""}`)
          .join(" ");
        const text = `${c.full_name} ${c.job_title ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${orgNames}`.toLowerCase();
        return text.includes(q);
      })
    : allContacts;

  const totalCount = allContacts.length;
  const activeCount = allContacts.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Contacts Directory</h1>
            <p className="text-sm text-muted">
              {totalCount} {totalCount === 1 ? "contact" : "contacts"} ({activeCount} active stakeholders)
            </p>
          </div>
        </div>

        <Link
          href="/contacts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <form method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search by name, organization, job title, or email..."
              className="w-full rounded-lg border border-border bg-workspace/50 py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={statusFilter || "all"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="unverified">Unverified</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
            >
              Filter
            </button>
            {(q || statusFilter) && (
              <Link
                href="/contacts"
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
          Failed to load contacts: {error.message}
        </div>
      )}

      {/* Empty State */}
      {filteredContacts.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-800">
            <UsersIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-charcoal">
            {allContacts.length === 0 ? "No contacts recorded yet" : "No contacts match your query"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {allContacts.length === 0
              ? "Build your commercial network by registering executives, site managers, and trade representatives."
              : "Try adjusting your search terms or status filter."}
          </p>
          <div className="mt-6">
            <Link
              href="/contacts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              <PlusIcon className="h-4 w-4" />
              Add a Contact
            </Link>
          </div>
        </div>
      )}

      {/* Contacts List Grid */}
      {filteredContacts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => {
            const orgLinks = contact.contact_organizations ?? [];
            const primaryOrg =
              orgLinks.find((o) => o.is_primary)?.organizations ||
              orgLinks[0]?.organizations ||
              null;

            return (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-navy-700 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-charcoal group-hover:text-navy-900 truncate">
                        {contact.full_name}
                      </h2>
                      {contact.job_title && (
                        <p className="text-xs font-medium text-muted truncate">{contact.job_title}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(
                        contact.status,
                      )}`}
                    >
                      {contact.status}
                    </span>
                  </div>

                  {primaryOrg && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-charcoal">
                      <BuildingIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                      <span className="truncate">{primaryOrg.trading_name || primaryOrg.legal_name}</span>
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-muted">
                    {contact.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MailIcon className="h-3.5 w-3.5 text-navy-700 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1.5">
                        <PhoneIcon className="h-3.5 w-3.5 text-navy-700 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
                  <span>
                    {orgLinks.length} {orgLinks.length === 1 ? "organization" : "organizations"}
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
