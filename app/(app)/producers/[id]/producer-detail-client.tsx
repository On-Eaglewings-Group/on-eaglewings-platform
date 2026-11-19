"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import {
  MineIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  GlobeIcon,
  ExternalLinkIcon,
  CheckIcon,
} from "@/app/components/icons";
import {
  updateProducerAction,
  deleteProducerAction,
  linkProducerMineAction,
  unlinkProducerMineAction,
} from "@/app/actions/producers";

interface ProducerDetailClientProps {
  organization: {
    id: string;
    legal_name: string;
    trading_name: string | null;
    country_code: string | null;
    registration_number: string | null;
    website_url: string | null;
    verification_status: string;
    notes: string | null;
    created_at: string;
  };
  profile: {
    description: string | null;
    production_notes: string | null;
  } | null;
  mineRoles: Array<{
    id: string;
    role: string;
    notes: string | null;
    mines: {
      id: string;
      name: string;
      country_code: string | null;
      region: string | null;
      status: string;
    } | null;
  }>;
  contacts: Array<{
    id: string;
    role: string | null;
    is_primary: boolean;
    contacts: {
      id: string;
      full_name: string;
      job_title: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  }>;
  availableMines: Array<{
    id: string;
    name: string;
    country_code: string | null;
    region: string | null;
  }>;
  canEdit: boolean;
  canDelete: boolean;
}

function verificationBadge(status: string) {
  switch (status) {
    case "verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "in_review":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function ProducerDetailClient({
  organization,
  profile,
  mineRoles,
  contacts,
  availableMines,
  canEdit,
  canDelete,
}: ProducerDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLinkingMine, setIsLinkingMine] = useState(false);
  const [selectedMineId, setSelectedMineId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"producer" | "operator" | "owner" | "associated">("producer");
  const [linkNotes, setLinkNotes] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinkPending, setIsLinkPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const updateActionWithId = updateProducerAction.bind(null, organization.id);
  const [editState, editFormAction, isEditPending] = useActionState(updateActionWithId, { ok: false });

  async function handleLinkMine(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMineId) return;
    setIsLinkPending(true);
    setLinkError(null);
    const res = await linkProducerMineAction(organization.id, selectedMineId, selectedRole, linkNotes);
    setIsLinkPending(false);
    if (!res.ok) {
      setLinkError(res.error || "Failed to link mine");
    } else {
      setIsLinkingMine(false);
      setSelectedMineId("");
      setLinkNotes("");
    }
  }

  async function handleUnlinkMine(roleId: string) {
    if (!confirm("Are you sure you want to remove this mine link?")) return;
    await unlinkProducerMineAction(roleId, organization.id);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this producer?")) return;
    setIsDeletePending(true);
    const res = await deleteProducerAction(organization.id);
    if (!res.ok) {
      alert(res.error || "Failed to remove producer");
      setIsDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Producer Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">
              {organization.trading_name || organization.legal_name}
            </h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${verificationBadge(
                organization.verification_status,
              )}`}
            >
              {organization.verification_status.replace("_", " ")}
            </span>
          </div>

          {organization.trading_name && (
            <p className="text-xs text-muted">Legal Name: {organization.legal_name}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted">
            {organization.country_code && <span>Country: {organization.country_code}</span>}
            {organization.registration_number && (
              <span className="font-mono">Reg: {organization.registration_number}</span>
            )}
            {organization.website_url && (
              <a
                href={organization.website_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-navy-700 hover:underline"
              >
                <GlobeIcon className="h-3 w-3" />
                Website <ExternalLinkIcon className="h-3 w-3" />
              </a>
            )}
            <span>Added {new Date(organization.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-workspace"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              {isEditing ? "View Overview" : "Edit Producer"}
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
          <h2 className="text-base font-semibold text-charcoal">Edit Producer Information</h2>

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
            <div>
              <label htmlFor="edit-legal-name" className="block text-xs font-medium text-charcoal">
                Legal Registered Name
              </label>
              <input
                id="edit-legal-name"
                name="legal_name"
                type="text"
                defaultValue={organization.legal_name}
                required
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-trading-name" className="block text-xs font-medium text-charcoal">
                Trading Name
              </label>
              <input
                id="edit-trading-name"
                name="trading_name"
                type="text"
                defaultValue={organization.trading_name ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-country" className="block text-xs font-medium text-charcoal">
                Country ISO (2 Letters)
              </label>
              <input
                id="edit-country"
                name="country_code"
                type="text"
                maxLength={2}
                defaultValue={organization.country_code ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm uppercase text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-reg" className="block text-xs font-medium text-charcoal">
                Registration / Tax ID
              </label>
              <input
                id="edit-reg"
                name="registration_number"
                type="text"
                defaultValue={organization.registration_number ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-url" className="block text-xs font-medium text-charcoal">
                Website URL
              </label>
              <input
                id="edit-url"
                name="website_url"
                type="url"
                defaultValue={organization.website_url ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-desc" className="block text-xs font-medium text-charcoal">
                Company Description
              </label>
              <textarea
                id="edit-desc"
                name="description"
                rows={2}
                defaultValue={profile?.description ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-prod" className="block text-xs font-medium text-charcoal">
                Production Capacity & Export Notes
              </label>
              <textarea
                id="edit-prod"
                name="production_notes"
                rows={3}
                defaultValue={profile?.production_notes ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-notes" className="block text-xs font-medium text-charcoal">
                Internal Commercial Notes
              </label>
              <textarea
                id="edit-notes"
                name="notes"
                rows={2}
                defaultValue={organization.notes ?? ""}
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
          {/* Main Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Production Profile */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-charcoal">Production Profile & Capability</h2>
              {profile?.description ? (
                <p className="text-xs text-charcoal leading-relaxed">{profile.description}</p>
              ) : (
                <p className="text-xs text-muted italic">No company overview recorded yet.</p>
              )}

              {profile?.production_notes && (
                <div className="mt-3 rounded-lg border border-border/70 bg-workspace/30 p-3 text-xs">
                  <span className="font-semibold text-charcoal block mb-1">Monthly Capacity & Supply Notes:</span>
                  <p className="text-charcoal whitespace-pre-wrap">{profile.production_notes}</p>
                </div>
              )}
            </div>

            {/* Linked Mines */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h2 className="text-sm font-semibold text-charcoal">Associated Mines & Sites</h2>
                {canEdit && (
                  <button
                    onClick={() => setIsLinkingMine(!isLinkingMine)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Link Mine
                  </button>
                )}
              </div>

              {/* Add Mine Link Form */}
              {isLinkingMine && (
                <form onSubmit={handleLinkMine} className="space-y-3 rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-xs">
                  <p className="font-semibold text-charcoal">Link a Mining Property</p>
                  {linkError && <p className="text-red-700">{linkError}</p>}
                  <div>
                    <label className="block text-muted">Select Mine</label>
                    <select
                      value={selectedMineId}
                      onChange={(e) => setSelectedMineId(e.target.value)}
                      required
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    >
                      <option value="">-- Choose mine --</option>
                      {availableMines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.country_code ? `(${m.country_code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted">Role at Mine</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as "producer" | "operator" | "owner" | "associated")}
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    >
                      <option value="producer">Producer</option>
                      <option value="operator">Operator</option>
                      <option value="owner">Owner</option>
                      <option value="associated">Associated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted">Notes (optional)</label>
                    <input
                      type="text"
                      value={linkNotes}
                      onChange={(e) => setLinkNotes(e.target.value)}
                      placeholder="e.g. Primary offtaker"
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLinkingMine(false)}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLinkPending}
                      className="rounded bg-navy-900 px-2 py-1 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50"
                    >
                      {isLinkPending ? "Saving..." : "Save Link"}
                    </button>
                  </div>
                </form>
              )}

              {mineRoles.length === 0 ? (
                <p className="text-xs text-muted">No mining properties currently associated with this producer.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {mineRoles.map((mr) => (
                    <div
                      key={mr.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <Link
                          href={`/mines/${mr.mines?.id}`}
                          className="font-medium text-charcoal hover:text-navy-900 hover:underline flex items-center gap-1.5"
                        >
                          <MineIcon className="h-3.5 w-3.5 text-navy-700 shrink-0" />
                          <span className="truncate">{mr.mines?.name}</span>
                        </Link>
                        <span className="text-[11px] text-muted block capitalize mt-0.5">
                          Role: {mr.role} {mr.notes ? `• ${mr.notes}` : ""}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleUnlinkMine(mr.id)}
                          className="text-muted hover:text-red-700 p-1"
                          title="Unlink mine"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Affiliated Contacts Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h2 className="text-sm font-semibold text-charcoal">Company Contacts</h2>
                <Link
                  href="/contacts/new"
                  className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Contact
                </Link>
              </div>

              {contacts.length === 0 ? (
                <p className="text-xs text-muted">No individual contacts registered for this entity yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-border/80 bg-workspace/30 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/contacts/${c.contacts?.id}`}
                          className="font-medium text-charcoal hover:text-navy-900 hover:underline truncate"
                        >
                          {c.contacts?.full_name}
                        </Link>
                        {c.is_primary && (
                          <span className="rounded bg-navy-100 px-1.5 py-0.2 text-[10px] font-semibold text-navy-800">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted">{c.role || c.contacts?.job_title || "Team Member"}</p>
                      {c.contacts?.email && (
                        <p className="text-[11px] text-navy-700 truncate">{c.contacts.email}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm text-xs space-y-2">
              <h2 className="text-sm font-semibold text-charcoal mb-2">Commercial Pipeline</h2>
              <Link
                href="/opportunities/new"
                className="flex items-center gap-2 text-navy-700 hover:text-navy-900 font-medium py-1"
              >
                <PlusIcon className="h-4 w-4" />
                Create opportunity for this producer
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
