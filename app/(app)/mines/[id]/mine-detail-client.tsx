"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import {
  MapPinIcon,
  BuildingIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
} from "@/app/components/icons";
import {
  updateMineAction,
  deleteMineAction,
  linkMineOrganizationAction,
  unlinkMineOrganizationAction,
  type MineOrgRole,
} from "@/app/actions/mines";

interface MineDetailClientProps {
  mine: {
    id: string;
    name: string;
    country_code: string | null;
    region: string | null;
    locality: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    source: string | null;
    external_reference: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  roles: Array<{
    id: string;
    role: string;
    notes: string | null;
    organizations: {
      id: string;
      legal_name: string;
      trading_name: string | null;
      country_code: string | null;
    } | null;
  }>;
  availableOrganizations: Array<{
    id: string;
    legal_name: string;
    trading_name: string | null;
  }>;
  canEdit: boolean;
  canDelete: boolean;
}

function statusBadge(status: string) {
  switch (status) {
    case "operating":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "care_and_maintenance":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "closed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export function MineDetailClient({
  mine,
  roles,
  availableOrganizations,
  canEdit,
  canDelete,
}: MineDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRole, setSelectedRole] = useState<MineOrgRole>("operator");
  const [linkNotes, setLinkNotes] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinkPending, setIsLinkPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const updateActionWithId = updateMineAction.bind(null, mine.id);
  const [editState, editFormAction, isEditPending] = useActionState(updateActionWithId, { ok: false });

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) return;
    setIsLinkPending(true);
    setLinkError(null);
    const res = await linkMineOrganizationAction(mine.id, selectedOrgId, selectedRole, linkNotes);
    setIsLinkPending(false);
    if (!res.ok) {
      setLinkError(res.error || "Failed to link organization");
    } else {
      setIsLinking(false);
      setSelectedOrgId("");
      setLinkNotes("");
    }
  }

  async function handleUnlink(roleId: string) {
    if (!confirm("Are you sure you want to remove this organization link?")) return;
    await unlinkMineOrganizationAction(roleId, mine.id);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this mine from the registry?")) return;
    setIsDeletePending(true);
    const res = await deleteMineAction(mine.id);
    if (!res.ok) {
      alert(res.error || "Failed to remove mine");
      setIsDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Detail Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">{mine.name}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(mine.status)}`}>
              {mine.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5 text-navy-700" />
              {[mine.locality, mine.region, mine.country_code].filter(Boolean).join(", ") || "No location recorded"}
            </span>
            {mine.external_reference && (
              <span className="font-mono">Ref: {mine.external_reference}</span>
            )}
            <span>Added {new Date(mine.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-workspace"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              {isEditing ? "View Details" : "Edit Mine"}
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeletePending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {isDeletePending ? "Removing..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Editing Form */}
      {isEditing ? (
        <form action={editFormAction} className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-charcoal">Edit Mine Details</h2>

          {editState?.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {editState.error}
            </div>
          )}

          {editState?.ok && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-center gap-2">
              <CheckIcon className="h-4 w-4" />
              Changes saved successfully.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="edit-name" className="block text-xs font-medium text-charcoal">
                Mine Name
              </label>
              <input
                id="edit-name"
                name="name"
                type="text"
                defaultValue={mine.name}
                required
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-status" className="block text-xs font-medium text-charcoal">
                Operational Status
              </label>
              <select
                id="edit-status"
                name="status"
                defaultValue={mine.status}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              >
                <option value="unverified">Unverified</option>
                <option value="operating">Operating / Active</option>
                <option value="care_and_maintenance">Care & Maintenance</option>
                <option value="closed">Closed</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-country" className="block text-xs font-medium text-charcoal">
                Country ISO (2 letters)
              </label>
              <input
                id="edit-country"
                name="country_code"
                type="text"
                maxLength={2}
                defaultValue={mine.country_code ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm uppercase text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-region" className="block text-xs font-medium text-charcoal">
                Region / Province
              </label>
              <input
                id="edit-region"
                name="region"
                type="text"
                defaultValue={mine.region ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-locality" className="block text-xs font-medium text-charcoal">
                Locality / District
              </label>
              <input
                id="edit-locality"
                name="locality"
                type="text"
                defaultValue={mine.locality ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-lat" className="block text-xs font-medium text-charcoal">
                Latitude
              </label>
              <input
                id="edit-lat"
                name="latitude"
                type="number"
                step="any"
                defaultValue={mine.latitude ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-lng" className="block text-xs font-medium text-charcoal">
                Longitude
              </label>
              <input
                id="edit-lng"
                name="longitude"
                type="number"
                step="any"
                defaultValue={mine.longitude ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-ref" className="block text-xs font-medium text-charcoal">
                Cadastre / License Ref
              </label>
              <input
                id="edit-ref"
                name="external_reference"
                type="text"
                defaultValue={mine.external_reference ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-source" className="block text-xs font-medium text-charcoal">
                Source
              </label>
              <input
                id="edit-source"
                name="source"
                type="text"
                defaultValue={mine.source ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-notes" className="block text-xs font-medium text-charcoal">
                Notes
              </label>
              <textarea
                id="edit-notes"
                name="notes"
                rows={3}
                defaultValue={mine.notes ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditPending}
              className="rounded-lg bg-navy-900 px-4 py-2 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50"
            >
              {isEditPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Location & Coordinates */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-charcoal">Geographical & License Specs</h2>
              <dl className="mt-3 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Country</dt>
                  <dd className="mt-0.5 font-medium text-charcoal">{mine.country_code || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Region / Province</dt>
                  <dd className="mt-0.5 font-medium text-charcoal">{mine.region || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Locality</dt>
                  <dd className="mt-0.5 font-medium text-charcoal">{mine.locality || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Latitude</dt>
                  <dd className="mt-0.5 font-mono text-charcoal">
                    {mine.latitude !== null ? mine.latitude.toFixed(5) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Longitude</dt>
                  <dd className="mt-0.5 font-mono text-charcoal">
                    {mine.longitude !== null ? mine.longitude.toFixed(5) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">License Ref</dt>
                  <dd className="mt-0.5 font-mono text-charcoal">{mine.external_reference || "—"}</dd>
                </div>
              </dl>

              {mine.source && (
                <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted">
                  <span className="font-medium text-charcoal">Source:</span> {mine.source}
                </div>
              )}
            </div>

            {/* Notes */}
            {mine.notes && (
              <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-charcoal">Operational Notes</h2>
                <p className="mt-2 text-xs leading-relaxed text-charcoal whitespace-pre-wrap">{mine.notes}</p>
              </div>
            )}
          </div>

          {/* Linked Organizations Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="text-sm font-semibold text-charcoal">Operating Network</h2>
                {canEdit && (
                  <button
                    onClick={() => setIsLinking(!isLinking)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Link Org
                  </button>
                )}
              </div>

              {/* Add Link Form */}
              {isLinking && (
                <form onSubmit={handleAddLink} className="mt-3 space-y-3 rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-xs">
                  <p className="font-semibold text-charcoal">Link Organization</p>
                  {linkError && <p className="text-red-700">{linkError}</p>}
                  <div>
                    <label className="block text-muted">Select Entity</label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      required
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    >
                      <option value="">-- Choose organization --</option>
                      {availableOrganizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.trading_name || org.legal_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted">Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as MineOrgRole)}
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    >
                      <option value="operator">Operator</option>
                      <option value="owner">Owner</option>
                      <option value="producer">Producer</option>
                      <option value="associated">Associated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted">Notes (optional)</label>
                    <input
                      type="text"
                      value={linkNotes}
                      onChange={(e) => setLinkNotes(e.target.value)}
                      placeholder="e.g. 80% stake"
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLinking(false)}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLinkPending}
                      className="rounded bg-navy-900 px-2 py-1 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50"
                    >
                      {isLinkPending ? "Linking..." : "Save"}
                    </button>
                  </div>
                </form>
              )}

              {/* Roles List */}
              <div className="mt-3 space-y-2">
                {roles.length === 0 ? (
                  <p className="text-xs text-muted">No operating entities linked to this mine yet.</p>
                ) : (
                  roles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-workspace/30 p-2.5 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <Link
                          href={`/producers/${r.organizations?.id}`}
                          className="font-medium text-charcoal hover:text-navy-900 hover:underline block truncate"
                        >
                          {r.organizations?.trading_name || r.organizations?.legal_name || "Unknown"}
                        </Link>
                        <span className="capitalize text-muted text-[11px] font-medium block">
                          Role: {r.role} {r.notes ? `(${r.notes})` : ""}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleUnlink(r.id)}
                          className="text-muted hover:text-red-700 p-1"
                          title="Remove relationship"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm text-xs space-y-2">
              <h2 className="text-sm font-semibold text-charcoal mb-2">Cross-Module Actions</h2>
              <Link
                href="/producers/new"
                className="flex items-center gap-2 text-navy-700 hover:text-navy-900 font-medium py-1"
              >
                <BuildingIcon className="h-4 w-4" />
                Register a new producer for this mine
              </Link>
              <Link
                href="/contacts/new"
                className="flex items-center gap-2 text-navy-700 hover:text-navy-900 font-medium py-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add site contact or commercial rep
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
