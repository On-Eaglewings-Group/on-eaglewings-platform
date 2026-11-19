"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface MineActionResult {
  ok: boolean;
  error?: string;
  mineId?: string;
}

const VALID_STATUSES = [
  "unverified",
  "operating",
  "care_and_maintenance",
  "closed",
  "unknown",
] as const;

export type MineStatus = (typeof VALID_STATUSES)[number];

const VALID_ROLES = ["owner", "operator", "producer", "associated"] as const;
export type MineOrgRole = (typeof VALID_ROLES)[number];

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function createMineAction(
  _prevState: MineActionResult | null,
  formData: FormData,
): Promise<MineActionResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const countryCode = (formData.get("country_code") as string | null)?.trim().toUpperCase() || null;
  const region = (formData.get("region") as string | null)?.trim() || null;
  const locality = (formData.get("locality") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "unverified";
  const source = (formData.get("source") as string | null)?.trim() || null;
  const externalReference = (formData.get("external_reference") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const latStr = (formData.get("latitude") as string | null)?.trim() || "";
  const lngStr = (formData.get("longitude") as string | null)?.trim() || "";
  const operatorOrgId = (formData.get("operator_organization_id") as string | null)?.trim() || null;
  const operatorRole = (formData.get("operator_role") as string | null)?.trim() || "operator";

  if (!name) {
    return { ok: false, error: "Mine name is required." };
  }

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code (e.g. ZM, CD, ZA)." };
  }

  const status = VALID_STATUSES.includes(statusRaw as MineStatus)
    ? (statusRaw as MineStatus)
    : "unverified";

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (latStr || lngStr) {
    if (!latStr || !lngStr) {
      return { ok: false, error: "Both latitude and longitude must be provided together, or both omitted." };
    }
    const latNum = parseFloat(latStr);
    const lngNum = parseFloat(lngStr);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return { ok: false, error: "Latitude must be a valid number between -90 and 90." };
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return { ok: false, error: "Longitude must be a valid number between -180 and 180." };
    }
    latitude = latNum;
    longitude = lngNum;
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
    return { ok: false, error: "You do not have permission to register mines." };
  }

  const mineId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("mines").insert({
    id: mineId,
    workspace_id: access.workspaceId,
    name,
    country_code: countryCode,
    region,
    locality,
    latitude,
    longitude,
    status,
    source,
    external_reference: externalReference,
    notes,
  });

  if (insertError) {
    if (insertError.code === "42501") {
      return { ok: false, error: "You are not permitted to register mines in this workspace." };
    }
    return { ok: false, error: `Failed to create mine: ${insertError.message}` };
  }

  // If an initial operator or producer was selected, link it — rollback mine on failure
  if (operatorOrgId) {
    const role = VALID_ROLES.includes(operatorRole as MineOrgRole) ? operatorRole : "operator";
    const { error: roleError } = await supabase.from("mine_organization_roles").insert({
      workspace_id: access.workspaceId,
      mine_id: mineId,
      organization_id: operatorOrgId,
      role,
    });

    if (roleError) {
      // Best-effort rollback: remove the orphaned mine record
      await supabase
        .from("mines")
        .delete()
        .eq("id", mineId)
        .eq("workspace_id", access.workspaceId);
      return {
        ok: false,
        error: `Failed to link the selected organization. The mine registration was rolled back. Please try again.`,
      };
    }
  }

  revalidatePath("/mines");
  revalidatePath("/");
  redirect(`/mines/${mineId}`);
}

export async function updateMineAction(
  mineId: string,
  _prevState: MineActionResult | null,
  formData: FormData,
): Promise<MineActionResult> {
  if (!mineId) {
    return { ok: false, error: "Invalid mine identifier." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const countryCode = (formData.get("country_code") as string | null)?.trim().toUpperCase() || null;
  const region = (formData.get("region") as string | null)?.trim() || null;
  const locality = (formData.get("locality") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "unverified";
  const source = (formData.get("source") as string | null)?.trim() || null;
  const externalReference = (formData.get("external_reference") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const latStr = (formData.get("latitude") as string | null)?.trim() || "";
  const lngStr = (formData.get("longitude") as string | null)?.trim() || "";

  if (!name) {
    return { ok: false, error: "Mine name is required." };
  }

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code (e.g. ZM, CD, ZA)." };
  }

  const status = VALID_STATUSES.includes(statusRaw as MineStatus)
    ? (statusRaw as MineStatus)
    : "unverified";

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (latStr || lngStr) {
    if (!latStr || !lngStr) {
      return { ok: false, error: "Both latitude and longitude must be provided together, or both omitted." };
    }
    const latNum = parseFloat(latStr);
    const lngNum = parseFloat(lngStr);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return { ok: false, error: "Latitude must be a valid number between -90 and 90." };
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return { ok: false, error: "Longitude must be a valid number between -180 and 180." };
    }
    latitude = latNum;
    longitude = lngNum;
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
    return { ok: false, error: "You do not have permission to edit mines." };
  }

  const { error: updateError } = await supabase
    .from("mines")
    .update({
      name,
      country_code: countryCode,
      region,
      locality,
      latitude,
      longitude,
      status,
      source,
      external_reference: externalReference,
      notes,
    })
    .eq("id", mineId)
    .eq("workspace_id", access.workspaceId);

  if (updateError) {
    return { ok: false, error: `Failed to update mine: ${updateError.message}` };
  }

  revalidatePath(`/mines/${mineId}`);
  revalidatePath("/mines");
  return { ok: true, mineId };
}

export async function deleteMineAction(mineId: string): Promise<MineActionResult> {
  if (!mineId) {
    return { ok: false, error: "Invalid mine identifier." };
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
    return { ok: false, error: "Only owners and administrators can remove mines." };
  }

  // Remove linked roles first
  await supabase
    .from("mine_organization_roles")
    .delete()
    .eq("mine_id", mineId)
    .eq("workspace_id", access.workspaceId);

  // Soft archive or delete the mine
  const { error } = await supabase
    .from("mines")
    .delete()
    .eq("id", mineId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    // If foreign keys prevent delete, archive it instead
    const { error: archiveError } = await supabase
      .from("mines")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", mineId)
      .eq("workspace_id", access.workspaceId);

    if (archiveError) {
      return { ok: false, error: `Could not delete or archive mine: ${archiveError.message}` };
    }
  }

  revalidatePath("/mines");
  revalidatePath("/");
  redirect("/mines");
}

export async function linkMineOrganizationAction(
  mineId: string,
  organizationId: string,
  role: MineOrgRole,
  notes?: string,
): Promise<MineActionResult> {
  if (!mineId || !organizationId) {
    return { ok: false, error: "Mine and Organization are required." };
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
    return { ok: false, error: "You do not have permission to manage mine relationships." };
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
      return { ok: false, error: "This organization is already linked with this role." };
    }
    return { ok: false, error: `Failed to link organization: ${error.message}` };
  }

  revalidatePath(`/mines/${mineId}`);
  return { ok: true, mineId };
}

export async function unlinkMineOrganizationAction(
  roleId: string,
  mineId: string,
): Promise<MineActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to manage mine relationships." };
  }

  const { error } = await supabase
    .from("mine_organization_roles")
    .delete()
    .eq("id", roleId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    return { ok: false, error: `Failed to remove relationship: ${error.message}` };
  }

  revalidatePath(`/mines/${mineId}`);
  return { ok: true, mineId };
}
