"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBuyerRequirementAction,
  updateBuyerRequirementAction,
  type BuyerRequirementActionResult,
} from "@/app/actions/buyer-requirements";
import { ArrowLeftIcon, ClipboardIcon, PlusIcon, TrashIcon } from "@/app/components/icons";
import Link from "next/link";

interface Organization {
  id: string;
  legal_name: string;
  trading_name: string | null;
}

interface Commodity {
  id: string;
  code: string;
  name: string;
}

interface WorkspaceMember {
  user_id: string;
  user_profiles: { display_name: string | null } | null;
}

interface UnitOption {
  code: string;
  name: string;
}

interface RequirementLine {
  id: string;
  commodityId: string;
  productForm: string;
  quantityMin: string;
  quantityMax: string;
  unitCode: string;
  deliveryFrom: string;
  deliveryUntil: string;
  notes: string;
}

interface RequirementFormProps {
  mode: "create" | "edit";
  requirementId?: string;
  organizations: Organization[];
  commodities: Commodity[];
  units: UnitOption[];
  members: WorkspaceMember[];
  initialLines?: RequirementLine[];
  defaultValues?: {
    title?: string;
    status?: string;
    buyer_organization_id?: string;
    owner_user_id?: string | null;
    target_delivery_from?: string | null;
    target_delivery_until?: string | null;
    delivery_country_code?: string | null;
    delivery_region?: string | null;
    delivery_location?: string | null;
    incoterm?: string | null;
    currency_code?: string | null;
    notes?: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "qualifying", label: "Qualifying" },
  { value: "qualified", label: "Qualified" },
  { value: "sourcing", label: "Sourcing" },
  { value: "matched", label: "Matched" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "on_hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRODUCT_FORMS = [
  { value: "ore", label: "Ore" },
  { value: "concentrate", label: "Concentrate" },
  { value: "slag", label: "Slag" },
  { value: "cathode", label: "Cathode" },
  { value: "ingot", label: "Ingot" },
  { value: "intermediate", label: "Intermediate" },
  { value: "other", label: "Other" },
];

const INCOTERMS = [
  "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP",
  "FAS", "FOB", "CFR", "CIF",
];

const emptyLine = (): RequirementLine => ({
  id: "",
  commodityId: "",
  productForm: "",
  quantityMin: "",
  quantityMax: "",
  unitCode: "",
  deliveryFrom: "",
  deliveryUntil: "",
  notes: "",
});

export function RequirementForm({
  mode,
  requirementId,
  organizations,
  commodities,
  units,
  members,
  initialLines,
  defaultValues = {},
}: RequirementFormProps) {
  const router = useRouter();
  const [lines, setLines] = useState<RequirementLine[]>(
    initialLines && initialLines.length > 0 ? initialLines : [emptyLine()],
  );

  const action = mode === "create" ? createBuyerRequirementAction : updateBuyerRequirementAction;


  const [state, formAction, isPending] = useActionState<
    BuyerRequirementActionResult | null,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [emptyLine()];
    });
  }

  function updateLine(
    idx: number,
    field: keyof RequirementLine,
    value: string,
  ) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && requirementId && (
        <input type="hidden" name="requirement_id" value={requirementId} />
      )}
      <input type="hidden" name="lines_submitted" value="1" />
      {state && !state.ok && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.ok && mode === "edit" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Requirement updated successfully.
        </div>
      )}

      {/* Core details */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Requirement Details</h2>

        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            defaultValue={defaultValues.title ?? ""}
            required
            placeholder="e.g. Copper cathode — Q2 2027 — 500 MT"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Buyer Organisation <span className="text-red-500">*</span>
            </label>
            <select
              name="buyer_organization_id"
              defaultValue={defaultValues.buyer_organization_id ?? ""}
              required
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">— Select buyer —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.legal_name}
                  {o.trading_name ? ` (${o.trading_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={defaultValues.status ?? "lead"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Requirement Owner
          </label>
          <select
            name="owner_user_id"
            defaultValue={defaultValues.owner_user_id ?? ""}
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_profiles?.display_name || "Workspace member"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delivery terms */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Delivery & Commercial Terms</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Target Delivery From
            </label>
            <input
              type="date"
              name="target_delivery_from"
              defaultValue={defaultValues.target_delivery_from ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Target Delivery Until
            </label>
            <input
              type="date"
              name="target_delivery_until"
              defaultValue={defaultValues.target_delivery_until ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Destination Country (ISO)
            </label>
            <input
              type="text"
              name="delivery_country_code"
              defaultValue={defaultValues.delivery_country_code ?? ""}
              maxLength={2}
              placeholder="e.g. ZA"
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Region
            </label>
            <input
              type="text"
              name="delivery_region"
              defaultValue={defaultValues.delivery_region ?? ""}
              placeholder="e.g. Gauteng"
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Location / Port
            </label>
            <input
              type="text"
              name="delivery_location"
              defaultValue={defaultValues.delivery_location ?? ""}
              placeholder="e.g. Durban Port"
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Preferred Incoterm
            </label>
            <select
              name="incoterm"
              defaultValue={defaultValues.incoterm ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">— None —</option>
              {INCOTERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Currency (ISO)
            </label>
            <input
              type="text"
              name="currency_code"
              defaultValue={defaultValues.currency_code ?? ""}
              maxLength={3}
              placeholder="e.g. USD"
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 uppercase"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            defaultValue={defaultValues.notes ?? ""}
            rows={3}
            placeholder="Specification requirements, quality notes, commercial context…"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 resize-none"
          />
        </div>
      </div>

      {/* Commodity lines */}
      {(
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">
              Commodity Lines
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add Line
            </button>
          </div>
          {commodities.length === 0 && (
            <p className="text-xs text-muted">
              The commodity catalogue could not be loaded. Existing lines stay attached to their saved commodity until the catalogue is available.
            </p>
          )}
          {lines.map((line, idx) => { 
            const commodityOptions = commodities.some((commodity) => commodity.id === line.commodityId) || !line.commodityId
              ? commodities
              : [...commodities, { id: line.commodityId, code: "saved", name: "Saved commodity" }];
            return (
              <div
                key={idx}
                className="rounded-lg border border-border bg-workspace/30 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">
                    Line {idx + 1}
                  </span>
                  {(lines.length > 1 || line.id) && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-muted hover:text-red-600"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <input type="hidden" name={`lines[${idx}][id]`} value={line.id} />
                <input
                  type="hidden"
                  name={`lines[${idx}][commodity_id]`}
                  value={line.commodityId}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Commodity
                    </label>
                    <select
                      value={line.commodityId}
                      onChange={(e) =>
                        updateLine(idx, "commodityId", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">— Select —</option>
                      {commodityOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Product Form
                    </label>
                    <select
                      name={`lines[${idx}][product_form]`}
                      value={line.productForm}
                      onChange={(e) =>
                        updateLine(idx, "productForm", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">— Any form —</option>
                      {PRODUCT_FORMS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Min Qty
                    </label>
                    <input
                      type="number"
                      name={`lines[${idx}][quantity_min]`}
                      value={line.quantityMin}
                      onChange={(e) =>
                        updateLine(idx, "quantityMin", e.target.value)
                      }
                      min={0}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Max Qty
                    </label>
                    <input
                      type="number"
                      name={`lines[${idx}][quantity_max]`}
                      value={line.quantityMax}
                      onChange={(e) =>
                        updateLine(idx, "quantityMax", e.target.value)
                      }
                      min={0}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Unit
                    </label>
                    <select
                      name={`lines[${idx}][unit_code]`}
                      value={line.unitCode}
                      onChange={(e) =>
                        updateLine(idx, "unitCode", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">—</option>
                      {(units.length > 0 ? units : [
                        { code: "kg", name: "Kilogram" },
                        { code: "t", name: "Metric tonne" },
                      ]).map((unit) => (
                        <option key={unit.code} value={unit.code}>
                          {unit.code} — {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Delivery from
                    </label>
                    <input
                      type="date"
                      name={`lines[${idx}][delivery_from]`}
                      value={line.deliveryFrom}
                      onChange={(e) => updateLine(idx, "deliveryFrom", e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Delivery until
                    </label>
                    <input
                      type="date"
                      name={`lines[${idx}][delivery_until]`}
                      value={line.deliveryUntil}
                      onChange={(e) => updateLine(idx, "deliveryUntil", e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">
                    Line Notes
                  </label>
                  <input
                    type="text"
                    name={`lines[${idx}][notes]`}
                    value={line.notes}
                    onChange={(e) => updateLine(idx, "notes", e.target.value)}
                    placeholder="Grade, purity, impurity limits…"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          <ClipboardIcon className="h-4 w-4" />
          {isPending
            ? mode === "create"
              ? "Saving…"
              : "Updating…"
            : mode === "create"
              ? "Save Requirement"
              : "Update Requirement"}
        </button>
        <Link
          href={
            mode === "edit" && requirementId
              ? `/buyer-requirements/${requirementId}`
              : "/buyer-requirements"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Cancel
        </Link>
      </div>
    </form>
  );
}
