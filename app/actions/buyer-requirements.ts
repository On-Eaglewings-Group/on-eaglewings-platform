"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

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

interface RequirementLineInput {
  commodityId: string;
  productForm: string | null;
  quantityMin: number | null;
  quantityMax: number | null;
  unitCode: string | null;
  deliveryFrom: string | null;
  deliveryUntil: string | null;
  notes: string | null;
}

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

function parseLines(formData: FormData): RequirementLineInput[] {
  const lines: RequirementLineInput[] = [];
  let i = 0;
  while (formData.get(`lines[${i}][commodity_id]`) !== null) {
    const commodityId = (formData.get(`lines[${i}][commodity_id]`) as string).trim();
    if (!commodityId) {
      i++;
      continue;
    }
    const productFormRaw = (formData.get(`lines[${i}][product_form]`) as string | null)?.trim();
    const productForm = productFormRaw && VALID_PRODUCT_FORMS.includes(productFormRaw as ProductForm) ? productFormRaw : null;
    const qMinStr = (formData.get(`lines[${i}][quantity_min]`) as string | null)?.trim();
    const qMaxStr = (formData.get(`lines[${i}][quantity_max]`) as string | null)?.trim();
    const unitCode = (formData.get(`lines[${i}][unit_code]`) as string | null)?.trim() || null;
    const deliveryFrom = (formData.get(`lines[${i}][delivery_from]`) as string | null)?.trim() || null;
    const deliveryUntil = (formData.get(`lines[${i}][delivery_until]`) as string | null)?.trim() || null;
    const notes = (formData.get(`lines[${i}][notes]`) as string | null)?.trim() || null;
    lines.push({
      commodityId,
      productForm,
      quantityMin: qMinStr ? parseFloat(qMinStr) : null,
      quantityMax: qMaxStr ? parseFloat(qMaxStr) : null,
      unitCode,
      deliveryFrom,
      deliveryUntil,
      notes,
    });
    i++;
  }
  return lines;
}

export async function createBuyerRequirementAction(
  _prevState: BuyerRequirementActionResult | null,
  formData: FormData,
): Promise<BuyerRequirementActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const buyerOrgId = (formData.get("buyer_organization_id") as string | null)?.trim() ?? "";
  const statusRaw = (formData.get("status") as string | null)?.trim() || "lead";
  const targetDeliveryFrom = (formData.get("target_delivery_from") as string | null)?.trim() || null;
  const targetDeliveryUntil = (formData.get("target_delivery_until") as string | null)?.trim() || null;
  const deliveryCountryCode = (formData.get("delivery_country_code") as string | null)?.trim() || null;
  const deliveryRegion = (formData.get("delivery_region") as string | null)?.trim() || null;
  const deliveryLocation = (formData.get("delivery_location") as string | null)?.trim() || null;
  const incoterm = (formData.get("incoterm") as string | null)?.trim() || null;
  const currencyCode = (formData.get("currency_code") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!title) {
    return { ok: false, error: "Requirement title is required." };
  }

  const status = VALID_STATUSES.includes(statusRaw as BuyerRequirementStatus)
    ? (statusRaw as BuyerRequirementStatus)
    : "lead";

  const newLines = parseLines(formData);
  for (const line of newLines) {
    const productForm = line.productForm ?? "";
    if (!VALID_PRODUCT_FORMS.includes(productForm as ProductForm)) {
      return { ok: false, error: `Invalid product form: ${productForm}.` };
    }
    if (line.quantityMin !== null && (isNaN(line.quantityMin) || line.quantityMin < 0)) {
      return { ok: false, error: "Minimum quantity must be a non‑negative number." };
    }
    if (line.quantityMax !== null && (isNaN(line.quantityMax) || line.quantityMax < 0)) {
      return { ok: false, error: "Maximum quantity must be a non‑negative number." };
    }
    if (line.quantityMin !== null && line.quantityMax !== null && line.quantityMin > line.quantityMax) {
      return { ok: false, error: "Minimum quantity must not exceed maximum quantity." };
    }
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
    return { ok: false, error: "You do not have permission to create buyer requirements." };
  }

  const requirementId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("buyer_requirements").insert({
    id: requirementId,
    workspace_id: access.workspaceId,
    title,
    status,
    buyer_organization_id: buyerOrgId,
    target_delivery_from: targetDeliveryFrom ?? "",
    target_delivery_until: targetDeliveryUntil ?? "",
    delivery_country_code: deliveryCountryCode ?? "",
    delivery_region: deliveryRegion ?? "",
    delivery_location: deliveryLocation ?? "",
    incoterm: incoterm ?? "",
    currency_code: currencyCode ?? "",
    notes: notes ?? "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    return { ok: false, error: `Failed to create buyer requirement: ${insertError.message}` };
  }

  const linesToInsert = newLines.map((line) => ({
    buyer_requirement_id: requirementId,
    workspace_id: access.workspaceId,
    commodity_id: line.commodityId,
    product_form: line.productForm,
    quantity_min: line.quantityMin,
    quantity_max: line.quantityMax,
    unit_code: line.unitCode,
    delivery_from: line.deliveryFrom,
    delivery_until: line.deliveryUntil,
    notes: line.notes,
  }));

  const { error: linesError } = await supabase.from("requirement_lines").insert(linesToInsert);
  if (linesError) {
    return { ok: false, error: `Failed to save commodity lines: ${linesError.message}` };
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
  const statusRaw = (formData.get("status") as string | null)?.trim() || "lead";
  const targetDeliveryFrom = (formData.get("target_delivery_from") as string | null)?.trim() || null;
  const targetDeliveryUntil = (formData.get("target_delivery_until") as string | null)?.trim() || null;
  const deliveryCountryCode = (formData.get("delivery_country_code") as string | null)?.trim() || null;
  const deliveryRegion = (formData.get("delivery_region") as string | null)?.trim() || null;
  const deliveryLocation = (formData.get("delivery_location") as string | null)?.trim() || null;
  const incoterm = (formData.get("incoterm") as string | null)?.trim() || null;
  const currencyCode = (formData.get("currency_code") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const status = VALID_STATUSES.includes(statusRaw as BuyerRequirementStatus)
    ? (statusRaw as BuyerRequirementStatus)
    : "lead";

  const newLines = parseLines(formData);
  for (const line of newLines) {
    const productForm = line.productForm ?? "";
    if (!VALID_PRODUCT_FORMS.includes(productForm as ProductForm)) {
      return { ok: false, error: `Invalid product form: ${productForm}.` };
    }
    if (line.quantityMin !== null && (isNaN(line.quantityMin) || line.quantityMin < 0)) {
      return { ok: false, error: "Minimum quantity must be a non‑negative number." };
    }
    if (line.quantityMax !== null && (isNaN(line.quantityMax) || line.quantityMax < 0)) {
      return { ok: false, error: "Maximum quantity must be a non‑negative number." };
    }
    if (line.quantityMin !== null && line.quantityMax !== null && line.quantityMin > line.quantityMax) {
      return { ok: false, error: "Minimum quantity must not exceed maximum quantity." };
    }
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

  const { error: updateError } = await supabase.from("buyer_requirements").update({
    title,
    status,
    buyer_organization_id: buyerOrgId,
    target_delivery_from: targetDeliveryFrom,
    target_delivery_until: targetDeliveryUntil,
    delivery_country_code: deliveryCountryCode,
    delivery_region: deliveryRegion,
    delivery_location: deliveryLocation,
    incoterm,
    currency_code: currencyCode,
    notes,
    updated_at: new Date().toISOString(),
  }).eq("id", requirementId).eq("workspace_id", access.workspaceId);

  if (updateError) {
    return { ok: false, error: `Failed to update requirement: ${updateError.message}` };
  }

  // delete existing lines
  const { error: deleteError } = await supabase.from("requirement_lines").delete()
    .eq("buyer_requirement_id", requirementId)
    .eq("workspace_id", access.workspaceId);
  if (deleteError) {
    return { ok: false, error: `Failed to delete old lines: ${deleteError.message}` };
  }

  const linesToInsert = newLines.map((line) => ({
    buyer_requirement_id: requirementId,
    workspace_id: access.workspaceId,
    commodity_id: line.commodityId,
    product_form: line.productForm,
    quantity_min: line.quantityMin,
    quantity_max: line.quantityMax,
    unit_code: line.unitCode,
    delivery_from: line.deliveryFrom,
    delivery_until: line.deliveryUntil,
    notes: line.notes,
  }));

  const { error: insertError } = await supabase.from("requirement_lines").insert(linesToInsert);
  if (insertError) {
    return { ok: false, error: `Failed to save commodity lines: ${insertError.message}` };
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
