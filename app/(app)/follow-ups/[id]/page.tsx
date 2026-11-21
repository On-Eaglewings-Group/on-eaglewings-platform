import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { firstRelation, profileDisplayName } from "@/lib/relations";
import {
  cancelFollowUpAction,
  completeFollowUpAction,
  deleteFollowUpAction,
  reopenFollowUpAction,
} from "@/app/actions/follow-ups";
import { ArrowLeftIcon, ClockIcon, PencilIcon } from "@/app/components/icons";
import { StatusButton } from "./status-button";

export default async function FollowUpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      id, title, description, due_at, priority, status, assigned_to, completed_at,
      contacts (id, full_name),
      meetings (id, title),
      mineral_opportunities (id, title),
      buyer_requirements (id, title)
    `)
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .single();

  if (error || !data) notFound();

  const { data: assignee } = data.assigned_to
    ? await supabase
        .from("workspace_memberships")
        .select("user_id, user_profiles(display_name)")
        .eq("workspace_id", access.workspaceId)
        .eq("user_id", data.assigned_to)
        .maybeSingle()
    : { data: null };

  const canEdit = ["owner", "admin", "manager", "contributor"].includes(access.role ?? "");
  const canDelete = access.role === "owner" || access.role === "admin";
  const contact = firstRelation(data.contacts as { full_name: string } | { full_name: string }[] | null);
  const meeting = firstRelation(data.meetings as { id: string; title: string } | { id: string; title: string }[] | null);
  const opportunity = firstRelation(data.mineral_opportunities as { id: string; title: string } | { id: string; title: string }[] | null);
  const requirement = firstRelation(data.buyer_requirements as { id: string; title: string } | { id: string; title: string }[] | null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">{data.title}</h1>
            <p className="text-sm capitalize text-muted">{String(data.status).replace("_", " ")} · {data.priority}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/follow-ups" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back
          </Link>
          {canEdit && (
            <Link href={`/follow-ups/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
              <PencilIcon className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm text-sm text-charcoal">
        <p>Due: {data.due_at ? String(data.due_at).slice(0, 10) : "Not set"}</p>
        <p>Assigned to: {assignee ? profileDisplayName(assignee.user_profiles) : "Unassigned"}</p>
        {data.description && <p className="whitespace-pre-line">{data.description}</p>}
        {contact && <p>Contact: {contact.full_name}</p>}
        {meeting && <p>Meeting: <Link className="text-navy-700 hover:underline" href={`/meetings/${meeting.id}`}>{meeting.title}</Link></p>}
        {opportunity && <p>Opportunity: <Link className="text-navy-700 hover:underline" href={`/opportunities/${opportunity.id}`}>{opportunity.title}</Link></p>}
        {requirement && <p>Requirement: <Link className="text-navy-700 hover:underline" href={`/buyer-requirements/${requirement.id}`}>{requirement.title}</Link></p>}
        {data.completed_at && <p className="text-muted">Completed {new Date(data.completed_at).toLocaleString()}</p>}
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {data.status !== "completed" && (
            <StatusButton action={completeFollowUpAction.bind(null, id)} label="Mark complete" />
          )}
          {data.status !== "cancelled" && data.status !== "completed" && (
            <StatusButton action={cancelFollowUpAction.bind(null, id)} label="Cancel follow-up" />
          )}
          {(data.status === "completed" || data.status === "cancelled") && (
            <StatusButton action={reopenFollowUpAction.bind(null, id)} label="Reopen" />
          )}
          {canDelete && <StatusButton action={deleteFollowUpAction.bind(null, id)} label="Delete" />}
        </div>
      )}
    </div>
  );
}
