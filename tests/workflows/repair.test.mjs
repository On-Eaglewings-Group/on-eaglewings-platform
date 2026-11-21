import assert from "node:assert/strict";
import test from "node:test";
import { formatWallClock, wallClockToUtcIso } from "../../lib/datetime.ts";
import {
  parseRequirementLines,
  planRequirementLineChanges,
  requirementLineFormError,
  validateRequirementLine,
} from "../../lib/requirement-lines.ts";

test("Johannesburg wall clock converts to UTC", () => {
  const iso = wallClockToUtcIso("2026-06-15", "09:00", "Africa/Johannesburg");
  assert.equal(iso, "2026-06-15T07:00:00.000Z");
  assert.deepEqual(formatWallClock(iso, "Africa/Johannesburg"), {
    date: "2026-06-15",
    time: "09:00",
  });
});

test("UTC wall clock is stored unchanged", () => {
  assert.equal(wallClockToUtcIso("2026-06-15", "09:30", "UTC"), "2026-06-15T09:30:00.000Z");
});

test("line updates are planned before any deletion", () => {
  const plan = planRequirementLineChanges(
    ["keep", "remove"],
    [
      {
        id: "keep",
        commodityId: "cu",
        productForm: "cathode",
        quantityMin: 1,
        quantityMax: 2,
        unitCode: "t",
        deliveryFrom: null,
        deliveryUntil: null,
        notes: null,
      },
      {
        id: null,
        commodityId: "zn",
        productForm: null,
        quantityMin: null,
        quantityMax: null,
        unitCode: null,
        deliveryFrom: null,
        deliveryUntil: null,
        notes: null,
      },
    ],
  );
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(plan.plan.update.map((line) => line.id), ["keep"]);
  assert.equal(plan.plan.insert.length, 1);
  assert.deepEqual(plan.plan.deleteIds, ["remove"]);
});

test("a failed line does not authorise deleting stored lines", () => {
  const form = new FormData();
  form.set("lines[0][id]", "existing");
  form.set("lines[0][commodity_id]", "cu");
  form.set("lines[0][quantity_min]", "10");
  form.set("lines[0][unit_code]", "MT");
  const [line] = parseRequirementLines(form);
  assert.equal(validateRequirementLine({ ...line, unitCode: "t" }), null);
  assert.equal(
    validateRequirementLine({ ...line, unitCode: null }),
    "A mass unit is required when a quantity is entered. Use kg or t.",
  );
});

test("clearing a saved line commodity is rejected before any delete is planned", () => {
  const form = new FormData();
  form.set("lines[0][id]", "existing");
  form.set("lines[0][commodity_id]", "");
  assert.equal(
    requirementLineFormError(form),
    "Select a commodity for every existing line, or remove that line. Nothing was deleted.",
  );
});

test("unknown line ids are rejected before a write plan is returned", () => {
  const plan = planRequirementLineChanges(["known"], [
    {
      id: "other",
      commodityId: "cu",
      productForm: null,
      quantityMin: null,
      quantityMax: null,
      unitCode: null,
      deliveryFrom: null,
      deliveryUntil: null,
      notes: null,
    },
  ]);
  assert.equal(plan.ok, false);
});