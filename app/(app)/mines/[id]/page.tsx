import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ArrowLeftIcon } from "@/app/components/icons";
import { MineDetailClient } from "./mine-detail-client";

export default async function MineDetailPage({
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

  // Fetch mine details
  const { data: mine, error: mineError } = await supabase
    .from("mines")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (mineError || !mine) {
    notFound();
  }

  // Fetch linked organization roles
  const { data: rawRoles } = await supabase
    .from("mine_organization_roles")
    .select(`
      id,
      role,
      notes,
      organizations (
        id,
        legal_name,
        trading_name,
        country_code
      )
    `)
    .eq("mine_id", id)
    .eq("workspace_id", access.workspaceId);

  // Fetch all organizations in workspace to populate the link selector
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
          href="/mines"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Mines
        </Link>
      </div>

      <MineDetailClient
        mine={mine}
        roles={(rawRoles as unknown as Parameters<typeof MineDetailClient>[0]["roles"]) ?? []}
        availableOrganizations={availableOrganizations ?? []}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
