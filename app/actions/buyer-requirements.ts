export const VALID_STATUSES = [
  "lead",
  "qualifying",
  "qualified",
  "sourcing",
  "matched",
  "fulfilled",
  "on_hold",
  "closed",
export async function createBuyerRequirementAction(
export async function updateBuyerRequirementAction(
export async function deleteBuyerRequirementAction(requirementId: string): Promise<BuyerRequirementActionResult> {
export async function deleteRequirementLineAction(lineId: string, requirementId: string): Promise<BuyerRequirementActionResult> {
  if (!lineId) {
    return { ok: false, error: "Invalid line identifier." };
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
      error: "You do not have permission to remove commodity lines.",
    };
  }

  const { error } = await supabase.from("requirement_lines").delete().eq("id", lineId).eq("workspace_id", access.workspaceId);

  if (error) {
    return { ok: false, error: `Failed to remove line: ${error.message}` };
  }

  revalidatePath(`/buyer-requirements/${requirementId}`);
  return { ok: true, requirementId };
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
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canDelete(access.role)) {
    return {
      ok: false,
      error: "Only owners and administrators can remove buyer requirements.",
    };
  }

  // Remove child lines first
  await supabase.from("requirement_lines").delete().eq("buyer_requirement_id", requirementId).eq("workspace_id", access.workspaceId);

  const { error } = await supabase.from("buyer_requirements").delete().eq("id", requirementId).eq("workspace_id", access.workspaceId);

  if (error) {
    // Archive instead
    const { error: archiveError } = await supabase.from("buyer_requirements").update({ archived_at: new Date().toISOString() }).eq("id", requirementId).eq("workspace_id", access.workspaceId);

    if (archiveError) {
      return {
        ok: false,
        error: `Could not delete or archive requirement: ${archiveError.message}`,
      };
    }
  }

  revalidatePath("/buyer-requirements");
  revalidatePath("/");
  redirect("/buyer-requirements");
}
  _prevState: BuyerRequirementActionResult | null,
  formData: FormData,
): Promise<BuyerRequirementActionResult> {
  const requirementId = (formData.get("requirement_id") as string | null)?.trim() ?? "";
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

  // 1. Update the requirement record first
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
    return {
      ok: false,
      error: `Failed to update requirement: ${updateError.message}`,
    };
  }

  // 2. Delete existing commodity lines (only after requirement record is updated)
  const { error: deleteError } = await supabase.from("requirement_lines").delete().eq("buyer_requirement_id", requirementId).eq("workspace_id", access.workspaceId);

  if (deleteError) {
    return {
      ok: false,
      error: `Failed to remove existing commodity lines: ${deleteError.message}`,
    };
  }

  // 3. Insert validated new lines
  const newLines = parseLines(formData);
  for (const line of newLines) {
    const productForm = line.productForm ?? "";
    if (!VALID_PRODUCT_FORMS.includes(productForm as ProductForm)) {
      return {
        ok: false,
        error: `Invalid product form: ${productForm}. Valid forms: ${VALID_PRODUCT_FORMS.join(", ")}`,
      };
    }
    if (line.quantityMin !== null && (isNaN(line.quantityMin) || line.quantityMin < 0)) {
      return {
        ok: false,
        error: "Minimum quantity must be a non-negative number.",
      };
    }
    if (line.quantityMax !== null && (isNaN(line.quantityMax) || line.quantityMax < 0)) {
      return {
        ok: false,
        error: "Maximum quantity must be a non-negative number.",
      };
    }
    if (line.quantityMin !== null && line.quantityMax !== null && line.quantityMin > line.quantityMax) {
      return {
        ok: false,
        error: "Minimum quantity must not exceed maximum quantity.",
      };
    }
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
    // If insertion fails after deletion, return error without reporting success.
    // The requirement record is still valid; the lines need to be re-submitted.
    return {
      ok: false,
      error: `Failed to save commodity lines: ${insertError.message}. <a href="/buyer-requirements/${requirementId}/edit" className="underline text-navy-600 hover:text-navy-900">Re-submit lines</a>`,
    };
  }

  revalidatePath(`/buyer-requirements/${requirementId}`);
  revalidatePath("/buyer-requirements");
  return { ok: true, requirementId };
}
  _prevState: BuyerRequirementActionResult | null,
  formData: FormData,
): Promise<BuyerRequirementActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const buyerOrgId = (formData.get("buyer_organization_id") as string | null)?.trim() ?? "";
  const statusRaw = (formData.get("status") as string | null)?.trim() || "lead";

  const newLines = parseLines(formData);
  for (const line of newLines) {
    const productForm = line.productForm ?? "";
    if (!VALID_PRODUCT_FORMS.includes(productForm as ProductForm)) {
      return {
        ok: false,
        error: `Invalid product form: ${productForm}. Valid forms: ${VALID_PRODUCT_FORMS.join(", ")}`,
      };
    }
    if (line.quantityMin !== null && (isNaN(line.quantityMin) || line.quantityMin < 0)) {
      return {
        ok: false,
        error: "Minimum quantity must be a non-negative number.",
      };
    }
    if (line.quantityMax !== null && (isNaN(line.quantityMax) || line.quantityMax < 0)) {
      return {
        ok: false,
        error: "Maximum quantity must be a non-negative number.",
      };
    }
    if (line.quantityMin !== null && line.quantityMax !== null && line.quantityMin > line.quantityMax) {
      return {
        ok: false,
        error: "Minimum quantity must not exceed maximum quantity.",
      };
    }
  }

  if (!title) {
    return { ok: false, error: "Requirement title is required." };
  }

  const status = VALID_STATUSES.includes(statusRaw as BuyerRequirementStatus)
    ? (statusRaw as BuyerRequirementStatus)
    : "lead";

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
      error: "You do not have permission to create buyer requirements.",
    };
  }

  const buyerRequirementId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("buyer_requirements").insert({
    id: buyerRequirementId,
    workspace_id: access.workspaceId,
    title,
    status,
    buyer_organization_id: buyerOrgId,
    target_delivery_from: "",
    target_delivery_until: "",
    delivery_country_code: "",
    delivery_region: "",
    delivery_location: "",
    incoterm: "",
    currency_code: "",
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    return {
      ok: false,
      error: `Failed to create buyer requirement: ${insertError.message}`,
    };
  }

  const linesToInsert = newLines.map((line) => ({
    buyer_requirement_id: buyerRequirementId,
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
    return {
      ok: false,
      error: `Failed to save commodity lines: ${linesError.message}`,
    };
  }

  revalidatePath("/buyer-requirements");
  revalidatePath("/");
  return { ok: true, requirementId: buyerRequirementId };
}
  "cancelled",
] as const;
export type BuyerRequirementStatus = (typeof VALID_STATUSES)[number];

export const VALID_PRODUCT_FORMS = [
  "ore",
  "concentrate",
  "slag",
  "cathode",
  "ingot",
  "intermediate",
  "other",
] as const;
export type ProductForm = (typeof VALID_PRODUCT_FORMS)[number];

export interface RequirementLineInput {
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
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
export interface BuyerRequirementActionResult {
const VALID_STATUSES = [
export interface RequirementLineInput {
function canMutate(role: string): boolean {
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
  commodityId: string;
  productForm: string | null;
  quantityMin: number | null;
  quantityMax: number | null;
  unitCode: string | null;
  deliveryFrom: string | null;
  deliveryUntil: string | null;
  notes: string | null;
}
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
export type BuyerRequirementStatus = (typeof VALID_STATUSES)[number];

const VALID_PRODUCT_FORMS = [
  "ore",
  "concentrate",
  "slag",
  "cathode",
  "ingot",
  "intermediate",
  "other",
] as const;
export type ProductForm = (typeof VALID_PRODUCT_FORMS)[number];
  ok: boolean;
  error?: string;
  requirementId?: string;
}
import { redirect } from "next/navigation";
