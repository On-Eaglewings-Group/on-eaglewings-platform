import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { MeetingForm } from "@/app/(app)/meetings/components/meeting-form";
import { CalendarIcon, ArrowLeftIcon } from "@/app/components/icons";

export default async function MeetingsNewPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Schedule a Meeting</h1>
          <p className="text-sm text-muted">Schedule a commercial meeting with a partner or contact.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <MeetingForm
          mode="create"
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
        />
      </div>

      <div className="mt-6">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Meetings
        </Link>
      </div>
    </div>
  );
}
