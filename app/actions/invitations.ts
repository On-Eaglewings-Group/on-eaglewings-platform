"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";

const VALID_INVITE_ROLES = ["admin", "manager", "contributor", "viewer"] as const;
type InviteRole = (typeof VALID_INVITE_ROLES)[number];

export interface InviteActionResult {
  ok: boolean;
  error?: string;
}

export async function inviteUserAction(
  _prevState: InviteActionResult | null,
  formData: FormData,
): Promise<InviteActionResult> {
  const rawEmail = (formData.get("email") as string | null) ?? "";
  const rawRole = (formData.get("role") as string | null) ?? "";

  const email = rawEmail.trim().toLowerCase();
  const role = rawRole.trim() as InviteRole;

  if (!email) return { ok: false, error: "Email address is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!VALID_INVITE_ROLES.includes(role)) {
    return { ok: false, error: "Select a valid role." };
  }

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status !== "allowed") {
    return { ok: false, error: "You must be signed in to invite users." };
  }
  if (!["owner", "admin"].includes(access.role ?? "")) {
    return { ok: false, error: "Only owners and admins can invite team members." };
  }
  if (role === "admin" && access.role !== "owner") {
    return { ok: false, error: "Only workspace owners can invite administrators." };
  }

  const { error } = await supabase.from("pending_invitations").insert({
    workspace_id: access.workspaceId,
    invited_email: email,
    role,
    invited_by: access.userId,
  });

  if (error) {
    // Unique violation: a pending invitation already exists for this email.
    if (error.code === "23505") {
      return {
        ok: false,
        error: `An active invitation for ${email} already exists. Revoke it first to re-invite.`,
      };
    }
    return { ok: false, error: "Failed to create invitation. Please try again." };
  }

  revalidatePath("/settings/team");
  return { ok: true };
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<InviteActionResult> {
  if (!invitationId) return { ok: false, error: "Invalid invitation." };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status !== "allowed") {
    return { ok: false, error: "You must be signed in." };
  }
  if (!["owner", "admin"].includes(access.role ?? "")) {
    return { ok: false, error: "Only owners and admins can revoke invitations." };
  }

  const { error } = await supabase
    .from("pending_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("workspace_id", access.workspaceId!);

  if (error) return { ok: false, error: "Failed to revoke invitation." };

  revalidatePath("/settings/team");
  return { ok: true };
}

