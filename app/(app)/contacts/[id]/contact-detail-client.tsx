"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import {
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
} from "@/app/components/icons";
import {
  updateContactAction,
  deleteContactAction,
  linkContactOrganizationAction,
  unlinkContactOrganizationAction,
} from "@/app/actions/contacts";

interface ContactDetailClientProps {
  contact: {
    id: string;
    full_name: string;
    job_title: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  organizations: Array<{
    id: string;
    role: string | null;
    is_primary: boolean;
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
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "inactive":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export function ContactDetailClient({
  contact,
  organizations,
  availableOrganizations,
  canEdit,
  canDelete,
}: ContactDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinkPending, setIsLinkPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const updateActionWithId = updateContactAction.bind(null, contact.id);
  const [editState, editFormAction, isEditPending] = useActionState(updateActionWithId, { ok: false });

  async function handleLinkOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) return;
    setIsLinkPending(true);
    setLinkError(null);
    const res = await linkContactOrganizationAction(contact.id, selectedOrgId, selectedRole, isPrimary);
    setIsLinkPending(false);
    if (!res.ok) {
      setLinkError(res.error || "Failed to link organization");
    } else {
      setIsLinking(false);
      setSelectedOrgId("");
      setSelectedRole("");
      setIsPrimary(false);
    }
  }

  async function handleUnlink(linkId: string) {
    if (!confirm("Are you sure you want to remove this organization affiliation?")) return;
    await unlinkContactOrganizationAction(linkId, contact.id);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this contact?")) return;
    setIsDeletePending(true);
    const res = await deleteContactAction(contact.id);
    if (!res.ok) {
      alert(res.error || "Failed to remove contact");
      setIsDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Contact Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">{contact.full_name}</h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(
                contact.status,
              )}`}
            >
              {contact.status}
            </span>
          </div>

          {contact.job_title && (
            <p className="text-sm font-medium text-navy-800">{contact.job_title}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 text-navy-700 hover:underline"
              >
                <MailIcon className="h-3.5 w-3.5" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1.5 text-navy-700 hover:underline"
              >
                <PhoneIcon className="h-3.5 w-3.5" />
                {contact.phone}
              </a>
            )}
            <span>Added {new Date(contact.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-workspace"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              {isEditing ? "View Details" : "Edit Contact"}
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
          <h2 className="text-base font-semibold text-charcoal">Edit Contact Information</h2>

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
              <label htmlFor="edit-full-name" className="block text-xs font-medium text-charcoal">
                Full Name
              </label>
              <input
                id="edit-full-name"
                name="full_name"
                type="text"
                defaultValue={contact.full_name}
                required
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-job-title" className="block text-xs font-medium text-charcoal">
                Job Title / Designation
              </label>
              <input
                id="edit-job-title"
                name="job_title"
                type="text"
                defaultValue={contact.job_title ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-status" className="block text-xs font-medium text-charcoal">
                Status
              </label>
              <select
                id="edit-status"
                name="status"
                defaultValue={contact.status}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-email" className="block text-xs font-medium text-charcoal">
                Email Address
              </label>
              <input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={contact.email ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="edit-phone" className="block text-xs font-medium text-charcoal">
                Phone / Mobile
              </label>
              <input
                id="edit-phone"
                name="phone"
                type="tel"
                defaultValue={contact.phone ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-notes" className="block text-xs font-medium text-charcoal">
                Relationship Notes
              </label>
              <textarea
                id="edit-notes"
                name="notes"
                rows={3}
                defaultValue={contact.notes ?? ""}
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
            {/* Notes & Overview */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-charcoal">Relationship & Context</h2>
              {contact.notes ? (
                <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
              ) : (
                <p className="text-xs text-muted italic">No specific notes recorded for this contact.</p>
              )}
            </div>

            {/* Affiliated Organizations List */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h2 className="text-sm font-semibold text-charcoal">Affiliated Organizations</h2>
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
                <form onSubmit={handleLinkOrg} className="space-y-3 rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-xs">
                  <p className="font-semibold text-charcoal">Add Organization Affiliation</p>
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
                          {org.trading_name ? `${org.trading_name} (${org.legal_name})` : org.legal_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted">Role at Entity (optional)</label>
                    <input
                      type="text"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      placeholder="e.g. Technical Advisor, Local Representative"
                      className="mt-1 w-full rounded border border-border bg-white p-1.5 text-xs text-charcoal"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="rounded border-border text-navy-900"
                      />
                      <span>Set as primary organization for this contact</span>
                    </label>
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
                      {isLinkPending ? "Saving..." : "Save Affiliation"}
                    </button>
                  </div>
                </form>
              )}

              {organizations.length === 0 ? (
                <p className="text-xs text-muted">No organizations linked to this contact yet.</p>
              ) : (
                <div className="space-y-2">
                  {organizations.map((orgLink) => (
                    <div
                      key={orgLink.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <Link
                          href={`/producers/${orgLink.organizations?.id}`}
                          className="font-medium text-charcoal hover:text-navy-900 hover:underline flex items-center gap-1.5"
                        >
                          <BuildingIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span className="truncate">
                            {orgLink.organizations?.trading_name || orgLink.organizations?.legal_name}
                          </span>
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
                          <span>{orgLink.role || "Affiliate"}</span>
                          {orgLink.is_primary && (
                            <span className="rounded bg-navy-100 px-1.5 py-0.2 font-semibold text-navy-800">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleUnlink(orgLink.id)}
                          className="text-muted hover:text-red-700 p-1"
                          title="Remove affiliation"
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

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm text-xs space-y-3">
              <h2 className="text-sm font-semibold text-charcoal">Quick Business Actions</h2>
              <Link
                href="/meetings/new"
                className="flex items-center gap-2 text-navy-700 hover:text-navy-900 font-medium py-1"
              >
                <CalendarIcon className="h-4 w-4" />
                Schedule meeting with {contact.full_name.split(" ")[0]}
              </Link>
              <Link
                href="/follow-ups/new"
                className="flex items-center gap-2 text-navy-700 hover:text-navy-900 font-medium py-1"
              >
                <ClockIcon className="h-4 w-4" />
                Create follow-up task for this contact
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
