"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface ProducerActionResult {
  ok: boolean;
  error?: string;
  producerId?: string;
}

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function createProducerAction(
  _prevState: ProducerActionResult | null,
  formData: FormData,
): Promise<ProducerActionResult> {
  const legalName = (formData.get("legal_name") as string | null)?.trim() ?? "";
  const tradingName = (formData.get("trading_name") as string | null)?.trim() || null;
  const countryCode = (formData.get("country_code") as string | null)?.trim().toUpperCase() || null;
  const registrationNumber = (formData.get("registration_number") as string | null)?.trim() || null;
  const websiteUrl = (formData.get("website_url") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const productionNotes = (formData.get("production_notes") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const mineId = (formData.get("mine_id") as string | null)?.trim() || null;

  if (!legalName) {
    return { ok: false, error: "Legal company name is required." };
  }

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code (e.g. ZM, CD, ZA)." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to register producers." };
  }

  const organizationId = crypto.randomUUID();
  const normalizedName = legalName.toLowerCase();

  // 1. Create Organization (must start unverified per database trigger)
  const { error: orgError } = await supabase.from("organizations").insert({
    id: organizationId,
    workspace_id: access.workspaceId,
    legal_name: legalName,
    normalized_name: normalizedName,
    trading_name: tradingName,
    country_code: countryCode,
    registration_number: registrationNumber,
    website_url: websiteUrl,
    verification_status: "unverified",
    notes,
  });

  if (orgError) {
    if (orgError.code === "23505") {
      return { ok: false, error: "An organization with this name already exists in this workspace." };
    }
    if (orgError.code === "42501") {
      return { ok: false, error: "You are not permitted to register organizations in this workspace." };
    }
    return { ok: false, error: `Failed to create producer organization: ${orgError.message}` };
  }

  // 2. Create Producer Profile — rollback org if this fails
  const { error: profileError } = await supabase.from("producer_profiles").insert({
    workspace_id: access.workspaceId,
    organization_id: organizationId,
    description,
    production_notes: productionNotes,
  });

  if (profileError) {
    // Best-effort rollback: remove the orphaned organization
    await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId)
      .eq("workspace_id", access.workspaceId);
    return { ok: false, error: `Failed to save producer profile. The registration was rolled back. Please try again.` };
  }

  // 3. Link to mine if provided — rollback org + profile if this fails
  if (mineId) {
    const { error: mineRoleError } = await supabase.from("mine_organization_roles").insert({
      workspace_id: access.workspaceId,
      mine_id: mineId,
      organization_id: organizationId,
      role: "producer",
    });

    if (mineRoleError) {
      // Best-effort rollback: remove profile then organization
      await supabase
        .from("producer_profiles")
        .delete()
        .eq("organization_id", organizationId)
        .eq("workspace_id", access.workspaceId);
      await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId)
        .eq("workspace_id", access.workspaceId);
      return {
        ok: false,
        error: `Failed to link the selected mine. The registration was rolled back. Please try again.`,
      };
    }
  }

  revalidatePath("/producers");
  revalidatePath("/mines");
  revalidatePath("/");
  redirect(`/producers/${organizationId}`);
}

export async function updateProducerAction(
  organizationId: string,
  _prevState: ProducerActionResult | null,
  formData: FormData,
): Promise<ProducerActionResult> {
  if (!organizationId) {
    return { ok: false, error: "Invalid producer identifier." };
  }

  const legalName = (formData.get("legal_name") as string | null)?.trim() ?? "";
  const tradingName = (formData.get("trading_name") as string | null)?.trim() || null;
  const countryCode = (formData.get("country_code") as string | null)?.trim().toUpperCase() || null;
  const registrationNumber = (formData.get("registration_number") as string | null)?.trim() || null;
  const websiteUrl = (formData.get("website_url") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const productionNotes = (formData.get("production_notes") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!legalName) {
    return { ok: false, error: "Legal company name is required." };
  }

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code (e.g. ZM, CD, ZA)." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to edit producers." };
  }

  const normalizedName = legalName.toLowerCase();

  const { error: orgError } = await supabase
    .from("organizations")
    .update({
      legal_name: legalName,
      normalized_name: normalizedName,
      trading_name: tradingName,
      country_code: countryCode,
      registration_number: registrationNumber,
      website_url: websiteUrl,
      notes,
    })
    .eq("id", organizationId)
    .eq("workspace_id", access.workspaceId);

  if (orgError) {
    return { ok: false, error: `Failed to update organization details: ${orgError.message}` };
  }

  // Upsert or update producer profile
  const { error: profileError } = await supabase
    .from("producer_profiles")
    .upsert(
      {
        workspace_id: access.workspaceId,
        organization_id: organizationId,
        description,
        production_notes: productionNotes,
      },
      { onConflict: "workspace_id,organization_id" },
    );

  if (profileError) {
    return { ok: false, error: `Failed to update producer profile: ${profileError.message}` };
  }

  revalidatePath(`/producers/${organizationId}`);
  revalidatePath("/producers");
  return { ok: true, producerId: organizationId };
}

export async function deleteProducerAction(organizationId: string): Promise<ProducerActionResult> {
  if (!organizationId) {
    return { ok: false, error: "Invalid producer identifier." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canDelete(access.role)) {
    return { ok: false, error: "Only owners and administrators can remove producers." };
  }

  // Remove relationships first
  await supabase
    .from("mine_organization_roles")
    .delete()
    .eq("organization_id", organizationId)
    .eq("workspace_id", access.workspaceId);

  await supabase
    .from("contact_organizations")
    .delete()
    .eq("organization_id", organizationId)
    .eq("workspace_id", access.workspaceId);

  await supabase
    .from("producer_profiles")
    .delete()
    .eq("organization_id", organizationId)
    .eq("workspace_id", access.workspaceId);

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    // If foreign keys prevent deletion, archive it instead
    const { error: archiveError } = await supabase
      .from("organizations")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", organizationId)
      .eq("workspace_id", access.workspaceId);

    if (archiveError) {
      return { ok: false, error: `Could not delete or archive producer: ${archiveError.message}` };
    }
  }

  revalidatePath("/producers");
  revalidatePath("/");
  redirect("/producers");
}

export async function linkProducerMineAction(
  organizationId: string,
  mineId: string,
  role: "producer" | "operator" | "owner" | "associated" = "producer",
  notes?: string,
): Promise<ProducerActionResult> {
  if (!organizationId || !mineId) {
    return { ok: false, error: "Producer and Mine are required." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to link mines." };
  }

  const { error } = await supabase.from("mine_organization_roles").insert({
    workspace_id: access.workspaceId,
    mine_id: mineId,
    organization_id: organizationId,
    role,
    notes: notes?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This producer is already linked to this mine with this role." };
    }
    return { ok: false, error: `Failed to link mine: ${error.message}` };
  }

  revalidatePath(`/producers/${organizationId}`);
  return { ok: true, producerId: organizationId };
}

export async function unlinkProducerMineAction(
  roleId: string,
  organizationId: string,
): Promise<ProducerActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to remove mine links." };
  }

  const { error } = await supabase
    .from("mine_organization_roles")
    .delete()
    .eq("id", roleId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    return { ok: false, error: `Failed to unlink mine: ${error.message}` };
  }

  revalidatePath(`/producers/${organizationId}`);
  return { ok: true, producerId: organizationId };
}
