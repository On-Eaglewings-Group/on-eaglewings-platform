/**
 * Buyer-requirement line parsing and a non-destructive change plan.
 *
 * Existing lines are updated and new lines are inserted before any line is
 * deleted. A failed insert therefore cannot remove specification rows that
 * were already saved.
 */

export const MASS_UNIT_CODES = ["kg", "t"] as const;

export interface RequirementLineInput {
  id: string | null;
  commodityId: string;
  productForm: string | null;
  quantityMin: number | null;
  quantityMax: number | null;
  unitCode: string | null;
  deliveryFrom: string | null;
  deliveryUntil: string | null;
  notes: string | null;
}

export interface RequirementLinePlan {
  update: RequirementLineInput[];
  insert: RequirementLineInput[];
  deleteIds: string[];
}

const PRODUCT_FORMS = new Set([
  "ore",
  "concentrate",
  "slag",
  "cathode",
  "ingot",
  "intermediate",
  "other",
]);

export function normalizeMassUnit(code: string | null): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (normalized === "kg" || normalized === "kgs" || normalized === "kilogram" || normalized === "kilograms") {
    return "kg";
  }
  if (
    normalized === "t" ||
    normalized === "mt" ||
    normalized === "tonne" ||
    normalized === "tonnes" ||
    normalized === "ton"
  ) {
    return "t";
  }
  return null;
}

function optionalNumber(value: string | null): number | null {
  if (!value) return null;
  return Number(value);
}

export function parseRequirementLines(formData: FormData): RequirementLineInput[] {
  const lines: RequirementLineInput[] = [];
  let index = 0;

  while (formData.get(`lines[${index}][commodity_id]`) !== null) {
    const commodityId = String(formData.get(`lines[${index}][commodity_id]`) ?? "").trim();
    const id = String(formData.get(`lines[${index}][id]`) ?? "").trim() || null;
    const productFormRaw = String(formData.get(`lines[${index}][product_form]`) ?? "").trim();
    const unitRaw = String(formData.get(`lines[${index}][unit_code]`) ?? "").trim();

    if (commodityId) {
      lines.push({
        id,
        commodityId,
        productForm: productFormRaw || null,
        quantityMin: optionalNumber(String(formData.get(`lines[${index}][quantity_min]`) ?? "").trim()),
        quantityMax: optionalNumber(String(formData.get(`lines[${index}][quantity_max]`) ?? "").trim()),
        unitCode: unitRaw || null,
        deliveryFrom: String(formData.get(`lines[${index}][delivery_from]`) ?? "").trim() || null,
        deliveryUntil: String(formData.get(`lines[${index}][delivery_until]`) ?? "").trim() || null,
        notes: String(formData.get(`lines[${index}][notes]`) ?? "").trim() || null,
      });
    }
    index += 1;
  }

  return lines;
}

export function requirementLineFormError(formData: FormData): string | null {
  let index = 0;
  while (formData.get(`lines[${index}][commodity_id]`) !== null) {
    const commodityId = String(formData.get(`lines[${index}][commodity_id]`) ?? "").trim();
    const id = String(formData.get(`lines[${index}][id]`) ?? "").trim();
    if (id && !commodityId) {
      return "Select a commodity for every existing line, or remove that line. Nothing was deleted.";
    }
    index += 1;
  }
  return null;
}

export function validateRequirementLine(line: RequirementLineInput): string | null {
  if (line.productForm && !PRODUCT_FORMS.has(line.productForm)) {
    return `Invalid product form: ${line.productForm}.`;
  }
  if (line.quantityMin !== null && (Number.isNaN(line.quantityMin) || line.quantityMin < 0)) {
    return "Minimum quantity must be a non-negative number.";
  }
  if (line.quantityMax !== null && (Number.isNaN(line.quantityMax) || line.quantityMax < 0)) {
    return "Maximum quantity must be a non-negative number.";
  }
  if (
    line.quantityMin !== null &&
    line.quantityMax !== null &&
    line.quantityMin > line.quantityMax
  ) {
    return "Minimum quantity must not exceed maximum quantity.";
  }
  if ((line.quantityMin !== null || line.quantityMax !== null) && !line.unitCode) {
    return "A mass unit is required when a quantity is entered. Use kg or t.";
  }
  if (line.unitCode) {
    const unit = normalizeMassUnit(line.unitCode);
    if (!unit) {
      return "Quantity unit must be a catalogue mass unit: kg or t (metric tonne).";
    }
  }
  if (line.deliveryFrom && line.deliveryUntil && line.deliveryUntil < line.deliveryFrom) {
    return "Line delivery end date must be on or after the start date.";
  }
  return null;
}

export function normalizeRequirementLine(line: RequirementLineInput): RequirementLineInput {
  return {
    ...line,
    unitCode: line.unitCode ? normalizeMassUnit(line.unitCode) : null,
  };
}

/**
 * Classify submitted lines against the ids already stored for this requirement.
 * Callers must apply `insert` and `update` successfully before deleting `deleteIds`.
 */
export function planRequirementLineChanges(
  existingIds: string[],
  incoming: RequirementLineInput[],
): { ok: true; plan: RequirementLinePlan } | { ok: false; error: string } {
  const existing = new Set(existingIds);
  const seen = new Set<string>();
  const update: RequirementLineInput[] = [];
  const insert: RequirementLineInput[] = [];

  for (const line of incoming) {
    if (line.id) {
      if (!existing.has(line.id)) {
        return {
          ok: false,
          error: "A commodity line does not belong to this requirement and was not changed.",
        };
      }
      if (seen.has(line.id)) {
        return { ok: false, error: "The same commodity line was submitted twice." };
      }
      seen.add(line.id);
      update.push(line);
    } else {
      insert.push(line);
    }
  }

  return {
    ok: true,
    plan: {
      update,
      insert,
      deleteIds: existingIds.filter((id) => !seen.has(id)),
    },
  };
}