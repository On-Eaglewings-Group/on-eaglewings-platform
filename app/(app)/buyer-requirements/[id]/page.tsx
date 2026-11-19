import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ArrowLeftIcon, PencilIcon, ClipboardIcon } from "@/app/components/icons";

interface RequirementRow {
  id: string;
  title: string;
  status: string;
  buyer_organization_id: string | null;
  owner_user_id: string | null;
  target_delivery_from: string | null;
  target_delivery_until: string | null;
  delivery_country_code: string | null;
  delivery_region: string | null;
  delivery_location: string | null;
  incoterm: string | null;
  currency_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  organizations?: Array<{ id: string; legal_name: string; trading_name: string | null }> | null;
  requirement_lines?: Array<{
    id: string;
    commodity_id: string;
    product_form: string | null;
    quantity_min: number | null;
    quantity_max: number | null;
    unit_code: string | null;
    delivery_from: string | null;
    delivery_until: string | null;
    notes: string | null;
    commodities?: { id: string; code: string; name: string } | null;
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

export default async function BuyerRequirementDetailPage({
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

  const { data: requirement, error } = await supabase
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
      delivery_region,
      delivery_location,
      incoterm,
      currency_code,
      notes,
      created_at,
      updated_at,
      archived_at,
      organizations (
        id,
        legal_name,
        trading_name
      ),
      requirement_lines (
        id,
        commodity_id,
        product_form,
        quantity_min,
        quantity_max,
        unit_code,
        delivery_from,
        delivery_until,
        notes,
        commodities (
          id,
          code,
          name
        )
      )
    `)
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (error || !requirement) {
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
            <ClipboardIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">{requirement.title}</h1>
            <p className="text-sm text-muted">Buyer requirement details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/buyer-requirements"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to Buyer Requirements
          </Link>
          {canEdit && (
            <Link
              href={`/buyer-requirements/${id}/edit`}
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
                    requirement.status,
                  )}`}
                >
                  {formatStatus(requirement.status)}
                </span>
              </div>
              <div className="text-right text-xs text-muted">
                <p>Updated {new Date(requirement.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
            <h2 className="mt-2 text-xl font-bold text-charcoal">{requirement.title}</h2>
            {requirement.notes && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Notes</h3>
                <p className="mt-1 text-sm text-charcoal whitespace-pre-line">{requirement.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Buyer & Delivery</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted">Buyer Organization</p>
                <p className="text-sm text-charcoal">
                  {requirement.organizations?.[0]?.trading_name || requirement.organizations?.[0]?.legal_name || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Incoterm</p>
                <p className="text-sm text-charcoal">{requirement.incoterm || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Currency</p>
                <p className="text-sm text-charcoal">{requirement.currency_code || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Delivery Country</p>
                <p className="text-sm text-charcoal">{requirement.delivery_country_code || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Delivery Region</p>
                <p className="text-sm text-charcoal">{requirement.delivery_region || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Delivery Location</p>
                <p className="text-sm text-charcoal">{requirement.delivery_location || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Delivery Window</p>
                <p className="text-sm text-charcoal">
                  {requirement.target_delivery_from
                    ? `From ${new Date(requirement.target_delivery_from).toLocaleDateString()}`
                    : "Not specified"}
                  {requirement.target_delivery_until
                    ? ` to ${new Date(requirement.target_delivery_until).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          {requirement.requirement_lines && requirement.requirement_lines.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Commodity Lines</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th className="pb-2 font-medium text-charcoal">Commodity</th>
                      <th className="pb-2 font-medium text-charcoal">Form</th>
                      <th className="pb-2 font-medium text-charcoal">Min Qty</th>
                      <th className="pb-2 font-medium text-charcoal">Max Qty</th>
                      <th className="pb-2 font-medium text-charcoal">Unit</th>
                      <th className="pb-2 font-medium text-charcoal">Delivery From</th>
                      <th className="pb-2 font-medium text-charcoal">Delivery Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {requirement.requirement_lines.map((line) => (
                      <tr key={line.id} className="text-xs">
                        <td className="py-3 text-charcoal truncate max-w-[120px]">
                          {line.commodities?.[0]?.name || line.commodities?.[0]?.code || "Unknown"}
                        </td>
                        <td className="py-3 text-muted capitalize">{line.product_form || "Not specified"}</td>
                        <td className="py-3 text-muted">{line.quantity_min ?? "-"}</td>
                        <td className="py-3 text-muted">{line.quantity_max ?? "-"}</td>
                        <td className="py-3 text-muted">{line.unit_code || "-"}</td>
                        <td className="py-3 text-muted">
                          {line.delivery_from ? new Date(line.delivery_from).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 text-muted">
                          {line.delivery_until ? new Date(line.delivery_until).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {requirement.requirement_lines.some((l) => l.notes) && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Line Notes</h3>
                  {requirement.requirement_lines
                    .filter((l) => l.notes)
                    .map((line) => (
                      <p key={line.id} className="text-sm text-charcoal whitespace-pre-line">{line.notes}</p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Status</span>
                <span className="text-sm font-medium text-charcoal capitalize">{formatStatus(requirement.status)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Created</span>
                <span className="text-sm font-medium text-charcoal">{new Date(requirement.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Owner</span>
                <span className="text-sm font-medium text-charcoal">{requirement.owner_user_id || "Not assigned"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-2">
              {canEdit && (
                <Link
                  href={`/buyer-requirements/${id}/edit`}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Requirement
                </Link>
              )}
              <Link
                href="/buyer-requirements"
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