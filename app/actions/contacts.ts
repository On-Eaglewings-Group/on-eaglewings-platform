"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface ContactActionResult {
  ok: boolean;
  error?: string;
  contactId?: string;
}

const VALID_CONTACT_STATUSES = ["active", "inactive", "unverified"] as const;
export type ContactStatus = (typeof VALID_CONTACT_STATUSES)[number];

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function createContactAction(
  _prevState: ContactActionResult | null,
  formData: FormData,
): Promise<ContactActionResult> {
  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  const jobTitle = (formData.get("job_title") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "active";
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const organizationId = (formData.get("organization_id") as string | null)?.trim() || null;
  const orgRole = (formData.get("organization_role") as string | null)?.trim() || jobTitle;
  const isPrimary = formData.get("is_primary") === "on" || formData.get("is_primary") === "true";

  if (!fullName) {
    return { ok: false, error: "Contact full name is required." };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const status = VALID_CONTACT_STATUSES.includes(statusRaw as ContactStatus)
    ? (statusRaw as ContactStatus)
    : "active";

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to create contacts." };
  }

  const contactId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("contacts").insert({
    id: contactId,
    workspace_id: access.workspaceId,
    full_name: fullName,
    job_title: jobTitle,
    email,
    phone,
    status,
    notes,
  });

  if (insertError) {
    if (insertError.code === "42501") {
      return { ok: false, error: "You are not permitted to add contacts in this workspace." };
    }
    return { ok: false, error: `Failed to create contact: ${insertError.message}` };
  }

  // Link to organization if provided — rollback contact on failure
  if (organizationId) {
    const { error: linkError } = await supabase.from("contact_organizations").insert({
      workspace_id: access.workspaceId,
      contact_id: contactId,
      organization_id: organizationId,
      role: orgRole,
      is_primary: isPrimary,
    });

    if (linkError) {
      // Best-effort rollback: remove the orphaned contact record
      await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("workspace_id", access.workspaceId);
      return {
        ok: false,
        error: `Failed to link the selected organization. The contact was rolled back. Please try again.`,
      };
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/");
  redirect(`/contacts/${contactId}`);
}

export async function updateContactAction(
  contactId: string,
  _prevState: ContactActionResult | null,
  formData: FormData,
): Promise<ContactActionResult> {
  if (!contactId) {
    return { ok: false, error: "Invalid contact identifier." };
  }

  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  const jobTitle = (formData.get("job_title") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "active";
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!fullName) {
    return { ok: false, error: "Contact full name is required." };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const status = VALID_CONTACT_STATUSES.includes(statusRaw as ContactStatus)
    ? (statusRaw as ContactStatus)
    : "active";

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }

  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      full_name: fullName,
      job_title: jobTitle,
      email,
      phone,
      status,
      notes,
    })
    .eq("id", contactId)
    .eq("workspace_id", access.workspaceId);

  if (updateError) {
    return { ok: false, error: `Failed to update contact: ${updateError.message}` };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { ok: true, contactId };
}

export async function deleteContactAction(contactId: string): Promise<ContactActionResult> {
  if (!contactId) {
    return { ok: false, error: "Invalid contact identifier." };
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
    return { ok: false, error: "Only owners and administrators can remove contacts." };
  }

  // Remove organization links first
  await supabase
    .from("contact_organizations")
    .delete()
    .eq("contact_id", contactId)
    .eq("workspace_id", access.workspaceId);

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    // If foreign keys prevent deletion, archive it instead
    const { error: archiveError } = await supabase
      .from("contacts")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("workspace_id", access.workspaceId);

    if (archiveError) {
      return { ok: false, error: `Could not delete or archive contact: ${archiveError.message}` };
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/");
  redirect("/contacts");
}

export async function linkContactOrganizationAction(
  contactId: string,
  organizationId: string,
  role?: string,
  isPrimary: boolean = false,
): Promise<ContactActionResult> {
  if (!contactId || !organizationId) {
    return { ok: false, error: "Contact and Organization are required." };
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
    return { ok: false, error: "You do not have permission to link organizations." };
  }

  // If setting as primary, clear any existing primary for this contact
  if (isPrimary) {
    await supabase
      .from("contact_organizations")
      .update({ is_primary: false })
      .eq("contact_id", contactId)
      .eq("workspace_id", access.workspaceId);
  }

  const { error } = await supabase.from("contact_organizations").insert({
    workspace_id: access.workspaceId,
    contact_id: contactId,
    organization_id: organizationId,
    role: role?.trim() || null,
    is_primary: isPrimary,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This organization is already linked to this contact." };
    }
    return { ok: false, error: `Failed to link organization: ${error.message}` };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true, contactId };
}

export async function unlinkContactOrganizationAction(
  linkId: string,
  contactId: string,
): Promise<ContactActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }

  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to remove organization links." };
  }

  const { error } = await supabase
    .from("contact_organizations")
    .delete()
    .eq("id", linkId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    return { ok: false, error: `Failed to unlink organization: ${error.message}` };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true, contactId };
}
