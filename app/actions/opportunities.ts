"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface OpportunityActionResult {
  ok: boolean;
  error?: string;
  opportunityId?: string;
}

const VALID_STATUSES = [
  "lead",
  "qualifying",
  "qualified",
  "in_negotiation",
  "awaiting_approval",
  "committed",
  "lost",
  "on_hold",
  "closed",
] as const;
export type OpportunityStatus = (typeof VALID_STATUSES)[number];

function canMutate(role: string): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "contributor"
  );
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function createOpportunityAction(
  _prevState: OpportunityActionResult | null,
  formData: FormData,
): Promise<OpportunityActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const statusRaw =
    (formData.get("status") as string | null)?.trim() || "lead";
  const sourceOrgId =
    (formData.get("source_organization_id") as string | null)?.trim() || null;
  const mineId = (formData.get("mine_id") as string | null)?.trim() || null;
  const ownerUserId =
    (formData.get("owner_user_id") as string | null)?.trim() || null;
  const confidenceStr =
    (formData.get("confidence") as string | null)?.trim() || "";
  const availableFrom =
    (formData.get("available_from") as string | null)?.trim() || null;
  const availableUntil =
    (formData.get("available_until") as string | null)?.trim() || null;
  const source = (formData.get("source") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!title) {
    return { ok: false, error: "Opportunity title is required." };
  }

  const status = VALID_STATUSES.includes(statusRaw as OpportunityStatus)
    ? (statusRaw as OpportunityStatus)
    : "lead";

  let confidence: number | null = null;
  if (confidenceStr !== "") {
    const n = parseInt(confidenceStr, 10);
    if (isNaN(n) || n < 0 || n > 100) {
      return {
        ok: false,
        error: "Confidence must be a number between 0 and 100.",
      };
    }
    confidence = n;
  }

  if (availableFrom && availableUntil && availableUntil < availableFrom) {
    return {
      ok: false,
      error: "Available until date must be on or after the available from date.",
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canMutate(access.role)) {
    return {
      ok: false,
      error: "You do not have permission to register opportunities.",
    };
  }

  const opportunityId = crypto.randomUUID();

  const { error: insertError } = await supabase
    .from("mineral_opportunities")
    .insert({
      id: opportunityId,
      workspace_id: access.workspaceId,
      title,
      status,
      source_organization_id: sourceOrgId,
      mine_id: mineId,
      owner_user_id: ownerUserId,
      confidence,
      available_from: availableFrom,
      available_until: availableUntil,
      source,
      notes,
    });

  if (insertError) {
    if (insertError.code === "42501") {
      return {
        ok: false,
        error: "You are not permitted to register opportunities in this workspace.",
      };
    }
    return {
      ok: false,
      error: `Failed to create opportunity: ${insertError.message}`,
    };
  }

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect(`/opportunities/${opportunityId}`);
}

export async function updateOpportunityAction(
  opportunityId: string,
  _prevState: OpportunityActionResult | null,
  formData: FormData,
): Promise<OpportunityActionResult> {
  if (!opportunityId) {
    return { ok: false, error: "Invalid opportunity identifier." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const statusRaw =
    (formData.get("status") as string | null)?.trim() || "lead";
  const sourceOrgId =
    (formData.get("source_organization_id") as string | null)?.trim() || null;
  const mineId = (formData.get("mine_id") as string | null)?.trim() || null;
  const ownerUserId =
    (formData.get("owner_user_id") as string | null)?.trim() || null;
  const confidenceStr =
    (formData.get("confidence") as string | null)?.trim() || "";
  const availableFrom =
    (formData.get("available_from") as string | null)?.trim() || null;
  const availableUntil =
    (formData.get("available_until") as string | null)?.trim() || null;
  const source = (formData.get("source") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!title) {
    return { ok: false, error: "Opportunity title is required." };
  }

  const status = VALID_STATUSES.includes(statusRaw as OpportunityStatus)
    ? (statusRaw as OpportunityStatus)
    : "lead";

  let confidence: number | null = null;
  if (confidenceStr !== "") {
    const n = parseInt(confidenceStr, 10);
    if (isNaN(n) || n < 0 || n > 100) {
      return {
        ok: false,
        error: "Confidence must be a number between 0 and 100.",
      };
    }
    confidence = n;
  }

  if (availableFrom && availableUntil && availableUntil < availableFrom) {
    return {
      ok: false,
      error: "Available until date must be on or after the available from date.",
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canMutate(access.role)) {
    return {
      ok: false,
      error: "You do not have permission to edit opportunities.",
    };
  }

  const { error: updateError } = await supabase
    .from("mineral_opportunities")
    .update({
      title,
      status,
      source_organization_id: sourceOrgId,
      mine_id: mineId,
      owner_user_id: ownerUserId,
      confidence,
      available_from: availableFrom,
      available_until: availableUntil,
      source,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opportunityId)
    .eq("workspace_id", access.workspaceId);

  if (updateError) {
    return {
      ok: false,
      error: `Failed to update opportunity: ${updateError.message}`,
    };
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/opportunities");
  return { ok: true, opportunityId };
}

export async function deleteOpportunityAction(
  opportunityId: string,
): Promise<OpportunityActionResult> {
  if (!opportunityId) {
    return { ok: false, error: "Invalid opportunity identifier." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canDelete(access.role)) {
    return {
      ok: false,
      error: "Only owners and administrators can remove opportunities.",
    };
  }

  // Try hard delete; if FK constraints prevent it, archive instead
  const { error } = await supabase
    .from("mineral_opportunities")
    .delete()
    .eq("id", opportunityId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    const { error: archiveError } = await supabase
      .from("mineral_opportunities")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", opportunityId)
      .eq("workspace_id", access.workspaceId);

    if (archiveError) {
      return {
        ok: false,
        error: `Could not delete or archive opportunity: ${archiveError.message}`,
      };
    }
  }

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect("/opportunities");
}
