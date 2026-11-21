"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  normalizeRequirementLine,
  parseRequirementLines,
  planRequirementLineChanges,
  requirementLineFormError,
  validateRequirementLine,
  type RequirementLineInput,
} from "@/lib/requirement-lines";

export interface BuyerRequirementActionResult {
  ok: boolean;
  error?: string;
  requirementId?: string;
}

export const VALID_STATUSES = [
  "lead",
  "qualifying",
  "qualified",
  "sourcing",
  "matched",
  "fulfilled",
  "on_hold",
  "closed",
  "cancelled",
] as const;
export type BuyerRequirementStatus = typeof VALID_STATUSES[number];

export const VALID_PRODUCT_FORMS = [
  "ore",
  "concentrate",
  "slag",
  "cathode",
  "ingot",
  "intermediate",
  "other",
] as const;
export type ProductForm = typeof VALID_PRODUCT_FORMS[number];

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

function optionalText(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string | null)?.trim() ?? "";
  return value || null;
}

function optionalIsoCode(value: string | null, length: number, label: string): string | null | { error: string } {
  if (!value) return null;
  const code = value.toUpperCase();
  if (code.length !== length || !/^[A-Z]+$/.test(code)) {
    return { error: `${label} must be a ${length}-letter ISO code.` };
  }
  return code;
}

function lineRow(workspaceId: string, requirementId: string, line: RequirementLineInput) {
  return {
    buyer_requirement_id: requirementId,
    workspace_id: workspaceId,
    commodity_id: line.commodityId,
    product_form: line.productForm,
    quantity_min: line.quantityMin,
    quantity_max: line.quantityMax,
    unit_code: line.unitCode,
    delivery_from: line.deliveryFrom,
    delivery_until: line.deliveryUntil,
    notes: line.notes,
  };
}

function prepareLines(formData: FormData): { lines: RequirementLineInput[] } | { error: string } {
  const formError = requirementLineFormError(formData);
  if (formError) return { error: formError };
  const parsed = parseRequirementLines(formData).map(normalizeRequirementLine);
  for (const line of parsed) {
    const problem = validateRequirementLine(line);
    if (problem) return { error: problem };
  }
  return { lines: parsed };
}

export async function createBuyerRequirementAction(
  _prevState: BuyerRequirementActionResult | null,
  formData: FormData,
): Promise<BuyerRequirementActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const buyerOrgId = (formData.get("buyer_organization_id") as string | null)?.trim() ?? "";
  const ownerUserId = optionalText(formData, "owner_user_id");
  const statusRaw = (formData.get("status") as string | null)?.trim() || "lead";
  const targetDeliveryFrom = optionalText(formData, "target_delivery_from");
  const targetDeliveryUntil = optionalText(formData, "target_delivery_until");
  const deliveryRegion = optionalText(formData, "delivery_region");
  const deliveryLocation = optionalText(formData, "delivery_location");
  const incoterm = optionalText(formData, "incoterm");
  const notes = optionalText(formData, "notes");
  const countryResult = optionalIsoCode(optionalText(formData, "delivery_country_code"), 2, "Destination country");
  const currencyResult = optionalIsoCode(optionalText(formData, "currency_code"), 3, "Currency");

  if (!title) {
    return { ok: false, error: "Requirement title is required." };
  }
  if (!buyerOrgId) {
    return { ok: false, error: "Select the buyer organisation." };
  }
  if (countryResult && typeof countryResult === "object") {
    return { ok: false, error: countryResult.error };
  }
  if (currencyResult && typeof currencyResult === "object") {
    return { ok: false, error: currencyResult.error };
  }
  if (targetDeliveryFrom && targetDeliveryUntil && targetDeliveryUntil < targetDeliveryFrom) {
    return { ok: false, error: "Target delivery end date must be on or after the start date." };
  }

  const status = VALID_STATUSES.includes(statusRaw as BuyerRequirementStatus)
    ? (statusRaw as BuyerRequirementStatus)
    : "lead";

  const prepared = prepareLines(formData);
  if ("error" in prepared) {
    return { ok: false, error: prepared.error };
  }
  const newLines = prepared.lines;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to create buyer requirements." };
  }

  const requirementId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("buyer_requirements").insert({
    id: requirementId,
    workspace_id: access.workspaceId,
    title,
    status,
    buyer_organization_id: buyerOrgId,
    owner_user_id: ownerUserId,
    target_delivery_from: targetDeliveryFrom,
    target_delivery_until: targetDeliveryUntil,
    delivery_country_code: countryResult,
    delivery_region: deliveryRegion,
    delivery_location: deliveryLocation,
    incoterm,
    currency_code: currencyResult,
    notes,
  });

  if (insertError) {
    return { ok: false, error: `Failed to create buyer requirement: ${insertError.message}` };
  }

  if (newLines.length > 0) {
    const { error: linesError } = await supabase
      .from("requirement_lines")
      .insert(newLines.map((line) => lineRow(access.workspaceId, requirementId, line)));
    if (linesError) {
      const { error: rollbackError } = await supabase
        .from("buyer_requirements")
        .delete()
        .eq("id", requirementId)
        .eq("workspace_id", access.workspaceId);
      if (rollbackError) {
        return {
          ok: false,
          error: `The requirement was saved, but its commodity lines were not. Open it and save the lines again. ${linesError.message}`,
        };
      }
      return {
        ok: false,
        error: `Commodity lines were not saved, so the new requirement was removed. ${linesError.message}`,
      };
    }
  }

  revalidatePath("/buyer-requirements");
  revalidatePath("/");
  redirect("/buyer-requirements");
  return { ok: true, requirementId };
}

export async function updateBuyerRequirementAction(
  _prevState: BuyerRequirementActionResult | null,
  formData: FormData,
): Promise<BuyerRequirementActionResult> {
  const requirementId = (formData.get("requirement_id") as string | null)?.trim() ?? "";
  if (!requirementId) {
    return { ok: false, error: "Invalid requirement identifier." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const buyerOrgId = (formData.get("buyer_organization_id") as string | null)?.trim() ?? "";
  const ownerUserId = optionalText(formData, "owner_user_id");
  const statusRaw = (formData.get("status") as string | null)?.trim() || "lead";
  const targetDeliveryFrom = optionalText(formData, "target_delivery_from");
  const targetDeliveryUntil = optionalText(formData, "target_delivery_until");
  const deliveryRegion = optionalText(formData, "delivery_region");
  const deliveryLocation = optionalText(formData, "delivery_location");
  const incoterm = optionalText(formData, "incoterm");
  const notes = optionalText(formData, "notes");
  const countryResult = optionalIsoCode(optionalText(formData, "delivery_country_code"), 2, "Destination country");
  const currencyResult = optionalIsoCode(optionalText(formData, "currency_code"), 3, "Currency");

  if (!title) {
    return { ok: false, error: "Requirement title is required." };
  }
  if (!buyerOrgId) {
    return { ok: false, error: "Select the buyer organisation." };
  }
  if (countryResult && typeof countryResult === "object") {
    return { ok: false, error: countryResult.error };
  }
  if (currencyResult && typeof currencyResult === "object") {
    return { ok: false, error: currencyResult.error };
  }
  if (targetDeliveryFrom && targetDeliveryUntil && targetDeliveryUntil < targetDeliveryFrom) {
    return { ok: false, error: "Target delivery end date must be on or after the start date." };
  }

  const status = VALID_STATUSES.includes(statusRaw as BuyerRequirementStatus)
    ? (statusRaw as BuyerRequirementStatus)
    : "lead";

  const prepared = prepareLines(formData);
  if ("error" in prepared) {
    return { ok: false, error: prepared.error };
  }
  if (formData.get("lines_submitted") !== "1") {
    return {
      ok: false,
      error: "Commodity lines were not included in this save, so existing lines were left unchanged.",
    };
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
    return { ok: false, error: "You do not have permission to edit buyer requirements." };
  }

  const { data: updatedRows, error: updateError } = await supabase.from("buyer_requirements").update({
    title,
    status,
    buyer_organization_id: buyerOrgId,
    owner_user_id: ownerUserId,
    target_delivery_from: targetDeliveryFrom,
    target_delivery_until: targetDeliveryUntil,
    delivery_country_code: countryResult,
    delivery_region: deliveryRegion,
    delivery_location: deliveryLocation,
    incoterm,
    currency_code: currencyResult,
    notes,
    updated_at: new Date().toISOString(),
  }).eq("id", requirementId).eq("workspace_id", access.workspaceId).select("id");

  if (updateError) {
    return { ok: false, error: `Failed to update requirement: ${updateError.message}` };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return {
      ok: false,
      error: "That requirement is not in this workspace, so its commodity lines were not changed.",
    };
  }

  const { data: existingLines, error: existingError } = await supabase
    .from("requirement_lines")
    .select("id")
    .eq("buyer_requirement_id", requirementId)
    .eq("workspace_id", access.workspaceId);

  if (existingError) {
    return { ok: false, error: `Requirement details were saved, but existing commodity lines could not be read: ${existingError.message}` };
  }

  const planned = planRequirementLineChanges(
    (existingLines ?? []).map((line) => line.id as string),
    prepared.lines,
  );
  if (!planned.ok) {
    return { ok: false, error: planned.error };
  }

  if (planned.plan.insert.length > 0) {
    const { error: insertError } = await supabase
      .from("requirement_lines")
      .insert(planned.plan.insert.map((line) => lineRow(access.workspaceId, requirementId, line)));
    if (insertError) {
      return {
        ok: false,
        error: `New commodity lines could not be saved. Existing lines were kept. ${insertError.message}`,
      };
    }
  }

  for (const line of planned.plan.update) {
    const { error: lineUpdateError } = await supabase
      .from("requirement_lines")
      .update({
        commodity_id: line.commodityId,
        product_form: line.productForm,
        quantity_min: line.quantityMin,
        quantity_max: line.quantityMax,
        unit_code: line.unitCode,
        delivery_from: line.deliveryFrom,
        delivery_until: line.deliveryUntil,
        notes: line.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.id)
      .eq("buyer_requirement_id", requirementId)
      .eq("workspace_id", access.workspaceId);
    if (lineUpdateError) {
      return {
        ok: false,
        error: `A commodity line could not be updated. Lines already stored were not deleted. ${lineUpdateError.message}`,
      };
    }
  }

  if (planned.plan.deleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("requirement_lines")
      .delete()
      .in("id", planned.plan.deleteIds)
      .eq("buyer_requirement_id", requirementId)
      .eq("workspace_id", access.workspaceId);
    if (deleteError) {
      return {
        ok: false,
        error: `Updated lines were saved, but a removed line could not be deleted. It may still have specification records. ${deleteError.message}`,
      };
    }
  }

  revalidatePath(`/buyer-requirements/${requirementId}`);
  revalidatePath("/buyer-requirements");
  return { ok: true, requirementId };
}

export async function deleteBuyerRequirementAction(requirementId: string): Promise<BuyerRequirementActionResult> {
  if (!requirementId) {
    return { ok: false, error: "Invalid requirement identifier." };
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
    return { ok: false, error: "Only owners and administrators can remove buyer requirements." };
  }

  // Delete child lines first
  await supabase.from("requirement_lines").delete()
    .eq("buyer_requirement_id", requirementId)
    .eq("workspace_id", access.workspaceId);

  const { error } = await supabase.from("buyer_requirements").delete()
    .eq("id", requirementId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    // attempt archive
    const { error: archiveError } = await supabase.from("buyer_requirements").update({ archived_at: new Date().toISOString() })
      .eq("id", requirementId)
      .eq("workspace_id", access.workspaceId);
    if (archiveError) {
      return { ok: false, error: `Could not delete or archive requirement: ${archiveError.message}` };
    }
  }

  revalidatePath("/buyer-requirements");
  revalidatePath("/");
  redirect("/buyer-requirements");
  return { ok: true };
}

export async function deleteRequirementLineAction(lineId: string, requirementId: string): Promise<BuyerRequirementActionResult> {
  if (!lineId) {
    return { ok: false, error: "Invalid line identifier." };
  }
  if (!requirementId) {
    return { ok: false, error: "Invalid requirement identifier." };
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
    return { ok: false, error: "You do not have permission to remove commodity lines." };
  }
  const { error } = await supabase.from("requirement_lines").delete()
    .eq("id", lineId)
    .eq("workspace_id", access.workspaceId);
  if (error) {
    return { ok: false, error: `Failed to remove line: ${error.message}` };
  }
  revalidatePath(`/buyer-requirements/${requirementId}`);
  return { ok: true, requirementId };
}
