import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { RequirementForm } from "@/app/(app)/buyer-requirements/components/requirement-form";
import { ArrowLeftIcon, ClipboardIcon } from "@/app/components/icons";

interface RequirementForForm {
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
}

export default async function BuyerRequirementEditPage({
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
    .select("id, title, status, buyer_organization_id, owner_user_id, target_delivery_from, target_delivery_until, delivery_country_code, delivery_region, delivery_location, incoterm, currency_code, notes")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (error || !requirement) {
    notFound();
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <ClipboardIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Edit Requirement</h1>
            <p className="text-sm text-muted">Modify buyer requirement details and specifications.</p>
          </div>
        </div>

        <Link
          href={`/buyer-requirements/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Requirement
        </Link>
      </div>

      <div className="max-w-2xl">
        <RequirementForm
          mode="edit"
          requirementId={id}
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
          defaultValues={{
            title: requirement.title,
            status: requirement.status,
            buyer_organization_id: requirement.buyer_organization_id,
            owner_user_id: requirement.owner_user_id,
            target_delivery_from: requirement.target_delivery_from,
            target_delivery_until: requirement.target_delivery_until,
            delivery_country_code: requirement.delivery_country_code,
            delivery_region: requirement.delivery_region,
            delivery_location: requirement.delivery_location,
            incoterm: requirement.incoterm,
            currency_code: requirement.currency_code,
            notes: requirement.notes,
          }}
        />
      </div>
    </div>
  );
}