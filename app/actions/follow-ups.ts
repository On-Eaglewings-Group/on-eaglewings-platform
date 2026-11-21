"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface FollowUpActionResult {
  ok: boolean;
  error?: string;
  followUpId?: string;
}

const STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type FollowUpStatus = (typeof STATUSES)[number];

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canDelete(role: string): boolean {
  return role === "owner" || role === "admin";
}

function optionalId(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string | null)?.trim() ?? "";
  return value || null;
}

function dueAtFromDate(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T12:00:00.000Z`;
}

function readFollowUp(formData: FormData): { error: string } | {
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: (typeof PRIORITIES)[number];
  status: FollowUpStatus;
  assignedTo: string | null;
  contactId: string | null;
  meetingId: string | null;
  opportunityId: string | null;
  requirementId: string | null;
} {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  if (!title) return { error: "Follow-up title is required." };

  const statusRaw = (formData.get("status") as string | null)?.trim() || "open";
  const priorityRaw = (formData.get("priority") as string | null)?.trim() || "normal";
  const status = STATUSES.includes(statusRaw as FollowUpStatus) ? (statusRaw as FollowUpStatus) : "open";
  const priority = PRIORITIES.includes(priorityRaw as (typeof PRIORITIES)[number])
    ? (priorityRaw as (typeof PRIORITIES)[number])
    : "normal";
  const dueDate = optionalId(formData, "due_on");

  return {
    title,
    description: optionalId(formData, "description"),
    dueAt: dueAtFromDate(dueDate),
    priority,
    status,
    assignedTo: optionalId(formData, "assigned_to"),
    contactId: optionalId(formData, "contact_id"),
    meetingId: optionalId(formData, "meeting_id"),
    opportunityId: optionalId(formData, "mineral_opportunity_id"),
    requirementId: optionalId(formData, "buyer_requirement_id"),
  };
}

function rowFromInput(
  workspaceId: string,
  input: Exclude<ReturnType<typeof readFollowUp>, { error: string }>,
) {
  return {
    workspace_id: workspaceId,
    title: input.title,
    description: input.description,
    due_at: input.dueAt,
    priority: input.priority,
    status: input.status,
    assigned_to: input.assignedTo,
    contact_id: input.contactId,
    meeting_id: input.meetingId,
    mineral_opportunity_id: input.opportunityId,
    buyer_requirement_id: input.requirementId,
    completed_at: input.status === "completed" ? new Date().toISOString() : null,
  };
}

export async function createFollowUpAction(
  _prev: FollowUpActionResult | null,
  formData: FormData,
): Promise<FollowUpActionResult> {
  const input = readFollowUp(formData);
  if ("error" in input) return { ok: false, error: input.error };

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to create follow-ups." };
  }

  const followUpId = crypto.randomUUID();
  const { error } = await supabase.from("follow_ups").insert({
    id: followUpId,
    ...rowFromInput(access.workspaceId, input),
  });
  if (error) {
    return { ok: false, error: `Failed to create follow-up: ${error.message}` };
  }

  revalidatePath("/follow-ups");
  revalidatePath("/");
  redirect(`/follow-ups/${followUpId}`);
}

export async function updateFollowUpAction(
  followUpId: string,
  _prev: FollowUpActionResult | null,
  formData: FormData,
): Promise<FollowUpActionResult> {
  if (!followUpId) return { ok: false, error: "Invalid follow-up." };
  const input = readFollowUp(formData);
  if ("error" in input) return { ok: false, error: input.error };

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to edit follow-ups." };
  }

  const { error } = await supabase
    .from("follow_ups")
    .update({ ...rowFromInput(access.workspaceId, input), updated_at: new Date().toISOString() })
    .eq("id", followUpId)
    .eq("workspace_id", access.workspaceId);
  if (error) return { ok: false, error: `Failed to update follow-up: ${error.message}` };

  revalidatePath(`/follow-ups/${followUpId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { ok: true, followUpId };
}

async function setStatus(followUpId: string, status: FollowUpStatus): Promise<FollowUpActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to update this follow-up." };
  }

  const { error } = await supabase
    .from("follow_ups")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", followUpId)
    .eq("workspace_id", access.workspaceId);
  if (error) return { ok: false, error: `Failed to update follow-up status: ${error.message}` };

  revalidatePath(`/follow-ups/${followUpId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { ok: true, followUpId };
}

export async function completeFollowUpAction(followUpId: string): Promise<FollowUpActionResult> {
  return setStatus(followUpId, "completed");
}

export async function cancelFollowUpAction(followUpId: string): Promise<FollowUpActionResult> {
  return setStatus(followUpId, "cancelled");
}

export async function reopenFollowUpAction(followUpId: string): Promise<FollowUpActionResult> {
  return setStatus(followUpId, "open");
}

export async function deleteFollowUpAction(followUpId: string): Promise<FollowUpActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canDelete(access.role)) {
    return { ok: false, error: "Only owners and administrators can delete follow-ups." };
  }

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followUpId)
    .eq("workspace_id", access.workspaceId);
  if (error) return { ok: false, error: `Failed to delete follow-up: ${error.message}` };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  redirect("/follow-ups");
}
