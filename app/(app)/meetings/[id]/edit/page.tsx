import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { MeetingForm } from "@/app/(app)/meetings/components/meeting-form";
import { ArrowLeftIcon, CalendarIcon } from "@/app/components/icons";

interface MeetingForForm {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  location: string | null;
  agenda: string | null;
  outcome: string | null;
  mineral_opportunity_id: string | null;
  buyer_requirement_id: string | null;
}

export default async function MeetingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id, title, status, starts_at, ends_at, timezone, location, agenda, outcome, mineral_opportunity_id, buyer_requirement_id")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .single();

  if (error || !meeting) {
    notFound();
  }

  // Fetch contacts for attendee selector
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, job_title, email")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("full_name", { ascending: true });

  // Fetch opportunities for related selector
  const { data: opportunities } = await supabase
    .from("mineral_opportunities")
    .select("id, title, status")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("title", { ascending: true });

  // Fetch requirements for related selector
  const { data: requirements } = await supabase
    .from("buyer_requirements")
    .select("id, title, status")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("title", { ascending: true });

  // Get existing attendee IDs
  const { data: attendees } = await supabase
    .from("meeting_attendees")
    .select("contact_id")
    .eq("meeting_id", id)
    .eq("workspace_id", access.workspaceId);

  const startsAt = meeting.starts_at ? new Date(meeting.starts_at) : null;
  const endsAt = meeting.ends_at ? new Date(meeting.ends_at) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Edit Meeting</h1>
            <p className="text-sm text-muted">Modify meeting details and attendees.</p>
          </div>
        </div>

        <Link
          href={`/meetings/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Meeting
        </Link>
      </div>

      <div className="max-w-2xl">
        <MeetingForm
          mode="edit"
          meetingId={id}
          contacts={(contacts ?? []).map((c) => ({
            id: c.id,
            full_name: c.full_name,
            job_title: c.job_title,
            email: c.email,
          }))}
          opportunities={(opportunities ?? []).map((o) => ({
            id: o.id,
            title: o.title,
            status: o.status,
          }))}
          requirements={(requirements ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
          }))}
          defaultValues={{
            title: meeting.title,
            starts_at_date: startsAt ? startsAt.toISOString().split("T")[0] : "",
            starts_at_time: startsAt ? startsAt.toISOString().split("T")[1].substring(0, 5) : "09:00",
            ends_at_date: endsAt ? endsAt.toISOString().split("T")[0] : null,
            ends_at_time: endsAt ? endsAt.toISOString().split("T")[1].substring(0, 5) : null,
            timezone: meeting.timezone || "UTC",
            location: meeting.location,
            agenda: meeting.agenda,
            outcome: meeting.outcome,
            status: meeting.status,
            mineral_opportunity_id: meeting.mineral_opportunity_id,
            buyer_requirement_id: meeting.buyer_requirement_id,
          }}
          defaultAttendeeIds={(attendees ?? []).map((a) => a.contact_id)}
        />
      </div>
    </div>
  );
}