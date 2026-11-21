"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface MeetingActionResult {
  ok: boolean;
  error?: string;
  meetingId?: string;
}

const VALID_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type MeetingStatus = (typeof VALID_STATUSES)[number];

const VALID_ATTENDANCE_STATUSES = [
  "invited",
  "accepted",
  "declined",
  "attended",
  "absent",
] as const;
export type AttendanceStatus = (typeof VALID_ATTENDANCE_STATUSES)[number];

function canMutate(role: string): boolean {
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

export async function createMeetingAction(
  _prevState: MeetingActionResult | null,
  formData: FormData,
): Promise<MeetingActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const startsAtDate = (formData.get("starts_at_date") as string | null)?.trim() ?? "";
  const startsAtTime = (formData.get("starts_at_time") as string | null)?.trim() ?? "09:00";
  const endsAtDate = (formData.get("ends_at_date") as string | null)?.trim() || null;
  const endsAtTime = (formData.get("ends_at_time") as string | null)?.trim() || null;
  const timezone = (formData.get("timezone") as string | null)?.trim() || "UTC";
  const location = (formData.get("location") as string | null)?.trim() || null;
  const agenda = (formData.get("agenda") as string | null)?.trim() || null;
  const outcome = (formData.get("outcome") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "scheduled";
  const opportunityId =
    (formData.get("mineral_opportunity_id") as string | null)?.trim() || null;
  const requirementId =
    (formData.get("buyer_requirement_id") as string | null)?.trim() || null;
  // Attendee contact IDs submitted as repeated field: attendee_ids[]
  const attendeeIds = formData.getAll("attendee_ids") as string[];

  if (!title) {
    return { ok: false, error: "Meeting title is required." };
  }
  if (!startsAtDate) {
    return { ok: false, error: "Meeting date is required." };
  }

  const startsAt = `${startsAtDate}T${startsAtTime}:00`;
  let endsAt: string | null = null;
  if (endsAtDate) {
    endsAt = `${endsAtDate}T${endsAtTime || startsAtTime}:00`;
    if (endsAt <= startsAt) {
      return {
        ok: false,
        error: "Meeting end time must be after the start time.",
      };
    }
  }

  const status = VALID_STATUSES.includes(statusRaw as MeetingStatus)
    ? (statusRaw as MeetingStatus)
    : "scheduled";

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
      error: "You do not have permission to schedule meetings.",
    };
  }

  const meetingId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("meetings").insert({
    id: meetingId,
    workspace_id: access.workspaceId,
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone,
    location,
    agenda,
    outcome,
    status,
    mineral_opportunity_id: opportunityId,
    buyer_requirement_id: requirementId,
  });

  if (insertError) {
    if (insertError.code === "42501") {
      return {
        ok: false,
        error: "You are not permitted to schedule meetings in this workspace.",
      };
    }
    return {
      ok: false,
      error: `Failed to create meeting: ${insertError.message}`,
    };
  }

  // Insert attendees — rollback meeting on failure
  const validAttendees = attendeeIds.filter((id) => id.trim());
  if (validAttendees.length > 0) {
    const attendeeRows = validAttendees.map((contactId) => ({
      workspace_id: access.workspaceId,
      meeting_id: meetingId,
      contact_id: contactId.trim(),
      attendance_status: "invited" as AttendanceStatus,
    }));

    const { error: attendeeError } = await supabase
      .from("meeting_attendees")
      .insert(attendeeRows);

    if (attendeeError) {
      // Rollback: remove the meeting
      await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId)
        .eq("workspace_id", access.workspaceId);
      return {
        ok: false,
        error: `Failed to add attendees. The meeting was rolled back. Please try again.`,
      };
    }
  }

  revalidatePath("/meetings");
  revalidatePath("/");
  redirect(`/meetings/${meetingId}`);
}

export async function updateMeetingAction(
  meetingId: string,
  _prevState: MeetingActionResult | null,
  formData: FormData,
): Promise<MeetingActionResult> {
  if (!meetingId) {
    return { ok: false, error: "Invalid meeting identifier." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const startsAtDate = (formData.get("starts_at_date") as string | null)?.trim() ?? "";
  const startsAtTime = (formData.get("starts_at_time") as string | null)?.trim() ?? "09:00";
  const endsAtDate = (formData.get("ends_at_date") as string | null)?.trim() || null;
  const endsAtTime = (formData.get("ends_at_time") as string | null)?.trim() || null;
  const timezone = (formData.get("timezone") as string | null)?.trim() || "UTC";
  const location = (formData.get("location") as string | null)?.trim() || null;
  const agenda = (formData.get("agenda") as string | null)?.trim() || null;
  const outcome = (formData.get("outcome") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "scheduled";
  const opportunityId =
    (formData.get("mineral_opportunity_id") as string | null)?.trim() || null;
  const requirementId =
    (formData.get("buyer_requirement_id") as string | null)?.trim() || null;

  if (!title) {
    return { ok: false, error: "Meeting title is required." };
  }
  if (!startsAtDate) {
    return { ok: false, error: "Meeting date is required." };
  }

  const startsAt = `${startsAtDate}T${startsAtTime}:00`;
  let endsAt: string | null = null;
  if (endsAtDate) {
    endsAt = `${endsAtDate}T${endsAtTime || startsAtTime}:00`;
    if (endsAt <= startsAt) {
      return {
        ok: false,
        error: "Meeting end time must be after the start time.",
      };
    }
  }

  const status = VALID_STATUSES.includes(statusRaw as MeetingStatus)
    ? (statusRaw as MeetingStatus)
    : "scheduled";

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
      error: "You do not have permission to edit meetings.",
    };
  }

  const { error: updateError } = await supabase
    .from("meetings")
    .update({
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone,
      location,
      agenda,
      outcome,
      status,
      mineral_opportunity_id: opportunityId,
      buyer_requirement_id: requirementId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId)
    .eq("workspace_id", access.workspaceId);

  if (updateError) {
    return {
      ok: false,
      error: `Failed to update meeting: ${updateError.message}`,
    };
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/meetings");
  return { ok: true, meetingId };
}

export async function deleteMeetingAction(
  meetingId: string,
): Promise<MeetingActionResult> {
  if (!meetingId) {
    return { ok: false, error: "Invalid meeting identifier." };
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
      error: "Only owners and administrators can remove meetings.",
    };
  }

  // Remove attendees first
  await supabase
    .from("meeting_attendees")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("workspace_id", access.workspaceId);

  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    // Archive via status update (meetings table has no archived_at)
    const { error: cancelError } = await supabase
      .from("meetings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", meetingId)
      .eq("workspace_id", access.workspaceId);

    if (cancelError) {
      return {
        ok: false,
        error: `Could not delete or cancel meeting: ${cancelError.message}`,
      };
    }
  }

  revalidatePath("/meetings");
  revalidatePath("/");
  redirect("/meetings");
}

export async function addAttendeeAction(
  meetingId: string,
  contactId: string,
  attendeeRole?: string,
): Promise<MeetingActionResult> {
  if (!meetingId || !contactId) {
    return { ok: false, error: "Meeting and contact are required." };
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
      error: "You do not have permission to add attendees.",
    };
  }

  const { error } = await supabase.from("meeting_attendees").insert({
    workspace_id: access.workspaceId,
    meeting_id: meetingId,
    contact_id: contactId,
    attendance_status: "invited",
    attendee_role: attendeeRole?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This contact is already an attendee." };
    }
    return { ok: false, error: `Failed to add attendee: ${error.message}` };
  }

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, meetingId };
}

export async function removeAttendeeAction(
  meetingId: string,
  contactId: string,
): Promise<MeetingActionResult> {
  if (!meetingId || !contactId) {
    return { ok: false, error: "Meeting and contact are required." };
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
      error: "You do not have permission to remove attendees.",
    };
  }

  const { error } = await supabase
    .from("meeting_attendees")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("contact_id", contactId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    return { ok: false, error: `Failed to remove attendee: ${error.message}` };
  }

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, meetingId };
}

export async function updateAttendanceStatusAction(
  meetingId: string,
  contactId: string,
  attendanceStatus: AttendanceStatus,
): Promise<MeetingActionResult> {
  if (!meetingId || !contactId) {
    return { ok: false, error: "Meeting and contact are required." };
  }
  if (!VALID_ATTENDANCE_STATUSES.includes(attendanceStatus)) {
    return { ok: false, error: "Invalid attendance status." };
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
      error: "You do not have permission to update attendance.",
    };
  }

  const { error } = await supabase
    .from("meeting_attendees")
    .update({ attendance_status: attendanceStatus })
    .eq("meeting_id", meetingId)
    .eq("contact_id", contactId)
    .eq("workspace_id", access.workspaceId);

  if (error) {
    return {
      ok: false,
      error: `Failed to update attendance: ${error.message}`,
    };
  }

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, meetingId };
}
