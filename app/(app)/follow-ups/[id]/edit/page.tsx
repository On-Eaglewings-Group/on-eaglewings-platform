import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { loadFollowUpOptions } from "@/lib/follow-up-options";
import { FollowUpForm } from "../../components/follow-up-form";

export default async function EditFollowUpPage({
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
    .select("id, title, description, due_at, priority, status, assigned_to, contact_id, meeting_id, mineral_opportunity_id, buyer_requirement_id")
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .single();

  if (error || !data) notFound();
  const options = await loadFollowUpOptions(supabase, access.workspaceId);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal">Edit follow-up</h1>
      <FollowUpForm
        mode="edit"
        followUpId={id}
        {...options}
        defaultValues={{
          title: data.title,
          description: data.description,
          due_on: data.due_at ? String(data.due_at).slice(0, 10) : "",
          priority: data.priority,
          status: data.status,
          assigned_to: data.assigned_to,
          contact_id: data.contact_id,
          meeting_id: data.meeting_id,
          mineral_opportunity_id: data.mineral_opportunity_id,
          buyer_requirement_id: data.buyer_requirement_id,
        }}
      />
    </div>
  );
}
