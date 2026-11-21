import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWallClock } from "@/lib/datetime";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ArrowLeftIcon, PencilIcon, FileIcon, CalendarIcon } from "@/app/components/icons";

interface MeetingDetail {
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
  created_at: string;
  updated_at: string;
  meeting_attendees?: Array<{
    contact_id: string;
    attendance_status: string | null;
    attendee_role: string | null;
    contacts?:
      | { id: string; full_name: string; job_title: string | null; email: string | null }
      | { id: string; full_name: string; job_title: string | null; email: string | null }[]
      | null;
  }> | null;
  mineral_opportunities?: { id: string; title: string } | null;
  buyer_requirements?: { id: string; title: string } | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled": return "bg-slate-100 text-slate-700 border-slate-200";
    case "no_show": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "scheduled": return "Scheduled";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "no_show": return "No Show";
    default: return status;
  }
}

export default async function MeetingDetailPage({
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
    .select(`
      id,
      title,
      status,
      starts_at,
      ends_at,
      timezone,
      location,
      agenda,
      outcome,
      mineral_opportunity_id,
      buyer_requirement_id,
      created_at,
      updated_at,
      meeting_attendees (
        contact_id,
        attendance_status,
        attendee_role,
        contacts (
          id,
          full_name,
          job_title,
          email
        )
      ),
      mineral_opportunities (
        id,
        title
      ),
      buyer_requirements (
        id,
        title
      )
    `)
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .single();

  if (error || !meeting) {
    notFound();
  }

  const canEdit =
    access.role === "owner" ||
    access.role === "admin" ||
    access.role === "manager" ||
    access.role === "contributor";

  const relatedOpportunity = meeting.mineral_opportunities?.[0]?.title || null;
  const relatedRequirement = meeting.buyer_requirements?.[0]?.title || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">{meeting.title}</h1>
            <p className="text-sm text-muted">Meeting details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to Meetings
          </Link>
          {canEdit && (
            <Link
              href={`/meetings/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                    meeting.status,
                  )}`}
                >
                  {formatStatus(meeting.status)}
                </span>
              </div>
              <div className="text-right text-xs text-muted">
                <p>Updated {new Date(meeting.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
            <h2 className="mt-2 text-xl font-bold text-charcoal">{meeting.title}</h2>
            {meeting.starts_at && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                <span>
                  {formatWallClock(meeting.starts_at, meeting.timezone || "UTC").date}{" "}
                  {formatWallClock(meeting.starts_at, meeting.timezone || "UTC").time}
                  {meeting.ends_at &&
                    ` – ${formatWallClock(meeting.ends_at, meeting.timezone || "UTC").time}`}
                  {` (${meeting.timezone || "UTC"})`}
                </span>
              </div>
            )}
            {meeting.location && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                <span className="truncate">{meeting.location}</span>
              </div>
            )}
            {meeting.agenda && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Agenda</h3>
                <p className="mt-1 text-sm text-charcoal whitespace-pre-line">{meeting.agenda}</p>
              </div>
            )}
            {meeting.outcome && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Outcome</h3>
                <p className="mt-1 text-sm text-charcoal whitespace-pre-line">{meeting.outcome}</p>
              </div>
            )}
          </div>

          {meeting.meeting_attendees && meeting.meeting_attendees.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">
                Attendees ({meeting.meeting_attendees.length})
              </h3>
              <div className="space-y-2">
                {meeting.meeting_attendees.map((a) => {
                  const contact = Array.isArray(a.contacts) ? a.contacts[0] : a.contacts;
                  return (
                  <div key={a.contact_id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">
                        {contact?.full_name || "Unknown contact"}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {contact?.job_title || contact?.email || ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted capitalize">
                      {a.attendance_status ?? "invited"}
                    </span>
                    {a.attendee_role && (
                      <span className="text-xs text-muted">{a.attendee_role}</span>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {(relatedOpportunity || relatedRequirement) && (
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Related</h3>
              {relatedOpportunity && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-workspace/50">
                  <FileIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                  <span className="text-sm text-charcoal">
                    Opportunity: {relatedOpportunity}
                  </span>
                </div>
              )}
              {relatedRequirement && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-workspace/50">
                  <FileIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                  <span className="text-sm text-charcoal">
                    Requirement: {relatedRequirement}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Status</span>
                <span className="text-sm font-medium text-charcoal capitalize">{formatStatus(meeting.status)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Timezone</span>
                <span className="text-sm font-medium text-charcoal">{meeting.timezone || "UTC"}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-workspace/50">
                <span className="text-sm text-muted">Created</span>
                <span className="text-sm font-medium text-charcoal">{new Date(meeting.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-2">
              {canEdit && (
                <Link
                  href={`/meetings/${id}/edit`}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Meeting
                </Link>
              )}
              <Link
                href="/meetings"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}