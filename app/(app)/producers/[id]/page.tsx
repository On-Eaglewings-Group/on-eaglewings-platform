import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ArrowLeftIcon } from "@/app/components/icons";
import { ProducerDetailClient } from "./producer-detail-client";

export default async function ProducerDetailPage({
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

  // Fetch organization
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (orgError || !organization) {
    notFound();
  }

  // Fetch producer profile
  const { data: profile } = await supabase
    .from("producer_profiles")
    .select("*")
    .eq("organization_id", id)
    .eq("workspace_id", access.workspaceId)
    .maybeSingle();

  // Fetch linked mines
  const { data: rawMineRoles } = await supabase
    .from("mine_organization_roles")
    .select(`
      id,
      role,
      notes,
      mines (
        id,
        name,
        country_code,
        region,
        status
      )
    `)
    .eq("organization_id", id)
    .eq("workspace_id", access.workspaceId);

  // Fetch linked contacts
  const { data: rawContacts } = await supabase
    .from("contact_organizations")
    .select(`
      id,
      role,
      is_primary,
      contacts (
        id,
        full_name,
        job_title,
        email,
        phone
      )
    `)
    .eq("organization_id", id)
    .eq("workspace_id", access.workspaceId);

  // Fetch all mines for link selector
  const { data: availableMines } = await supabase
    .from("mines")
    .select("id, name, country_code, region")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  const canEdit =
    access.role === "owner" ||
    access.role === "admin" ||
    access.role === "manager" ||
    access.role === "contributor";

  const canDelete = access.role === "owner" || access.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/producers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Producers
        </Link>
      </div>

      <ProducerDetailClient
        organization={organization}
        profile={profile}
        mineRoles={(rawMineRoles as unknown as Parameters<typeof ProducerDetailClient>[0]["mineRoles"]) ?? []}
        contacts={(rawContacts as unknown as Parameters<typeof ProducerDetailClient>[0]["contacts"]) ?? []}
        availableMines={availableMines ?? []}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
