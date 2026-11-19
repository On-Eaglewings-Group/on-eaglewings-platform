import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ArrowLeftIcon } from "@/app/components/icons";
import { ContactDetailClient } from "./contact-detail-client";

export default async function ContactDetailPage({
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

  // Fetch contact
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (contactError || !contact) {
    notFound();
  }

  // Fetch linked organizations
  const { data: rawOrgs } = await supabase
    .from("contact_organizations")
    .select(`
      id,
      role,
      is_primary,
      organizations (
        id,
        legal_name,
        trading_name,
        country_code
      )
    `)
    .eq("contact_id", id)
    .eq("workspace_id", access.workspaceId);

  // Fetch all organizations for link selector
  const { data: availableOrganizations } = await supabase
    .from("organizations")
    .select("id, legal_name, trading_name")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("legal_name", { ascending: true });

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
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Contacts
        </Link>
      </div>

      <ContactDetailClient
        contact={contact}
        organizations={(rawOrgs as unknown as Parameters<typeof ContactDetailClient>[0]["organizations"]) ?? []}
        availableOrganizations={availableOrganizations ?? []}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
