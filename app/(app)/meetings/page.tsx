import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { CalendarIcon, PlusIcon, SearchIcon, ChevronRightIcon, UsersIcon, FileIcon } from "@/app/components/icons";

interface MeetingRow {
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
    contacts?: { id: string; full_name: string; email: string | null } | null;
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

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "").trim();

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  let query = supabase
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
        contacts (
          id,
          full_name,
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
    .eq("workspace_id", access.workspaceId)
    .order("starts_at", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: rawMeetings, error } = await query;
  const allMeetings = (rawMeetings as unknown as MeetingRow[]) ?? [];

  const filteredMeetings = q
    ? allMeetings.filter((m) => {
        const attendees = (m.meeting_attendees ?? [])
          .map((a) => a.contacts?.full_name ?? "")
          .join(" ");
        const related = [
          m.mineral_opportunities?.title,
          m.buyer_requirements?.title,
        ].filter(Boolean).join(" ");
        const text = `${m.title} ${m.status} ${m.location ?? ""} ${m.agenda ?? ""} ${attendees} ${related}`.toLowerCase();
        return text.includes(q);
      })
    : allMeetings;

  const totalCount = allMeetings.length;
  const scheduledCount = allMeetings.filter((m) => m.status === "scheduled").length;
  const completedCount = allMeetings.filter((m) => m.status === "completed").length;

  const STATUS_FILTERS = [
    { value: "all", label: "All Statuses" },
    { value: "scheduled", label: "Scheduled" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no_show", label: "No Show" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Meetings</h1>
            <p className="text-sm text-muted">Schedule and track commercial meetings.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-1 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search meetings…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 pl-9 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Total Meetings</p>
          <p className="text-2xl font-bold text-charcoal">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Scheduled</p>
          <p className="text-2xl font-bold text-blue-700">{scheduledCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Completed</p>
          <p className="text-2xl font-bold text-emerald-700">{completedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <a
            key={filter.value}
            href={`/meetings?q=${encodeURIComponent(q)}&status=${filter.value}`}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-navy-900 border-navy-900 text-white"
                : "border-border bg-white text-charcoal hover:bg-workspace"
            }`}
          >
            {filter.label}
          </a>
        ))}
      </div>

      {filteredMeetings.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white/60 px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted">
              {q || statusFilter !== "all"
                ? "No meetings match your search or filter."
                : "No meetings scheduled yet."}
            </p>
            {!q && statusFilter === "all" && (
              <div className="mt-6">
                <Link
                  href="/meetings/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  Schedule a Meeting
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredMeetings.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((meeting) => {
            const attendees = meeting.meeting_attendees ?? [];
            const attendeeCount = attendees.length;
            const related = meeting.mineral_opportunities?.title || meeting.buyer_requirements?.title || null;
            const relatedType = meeting.mineral_opportunity_id ? "Opportunity" : meeting.buyer_requirement_id ? "Requirement" : null;
            return (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-navy-700 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-charcoal group-hover:text-navy-900 truncate">
                      {meeting.title}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                        meeting.status,
                      )}`}
                    >
                      {formatStatus(meeting.status)}
                    </span>
                  </div>

                  {meeting.starts_at && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <FileIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                      <span>{new Date(meeting.starts_at).toLocaleString()}</span>
                    </div>
                  )}

                  {meeting.location && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <UsersIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                      <span className="truncate">{meeting.location}</span>
                    </div>
                  )}

                  {attendeeCount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <UsersIcon className="h-3.5 w-3.5 shrink-0 text-navy-700" />
                      <span>{attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""}</span>
                    </div>
                  )}

                  {related && relatedType && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-charcoal">
                      <FileIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="truncate font-medium">{relatedType}: {related}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
                  <span>
                    {new Date(meeting.created_at).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-navy-900 group-hover:translate-x-0.5 transition-transform">
                    View <ChevronRightIcon className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filteredMeetings.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted">
            {filteredMeetings.length} of {totalCount} meeting
            {totalCount !== 1 ? "s" : ""} displayed
          </p>
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
          >
            <PlusIcon className="h-4 w-4" />
            Schedule a Meeting
          </Link>
        </div>
      )}
    </div>
  );
}