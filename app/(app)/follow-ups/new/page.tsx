import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { loadFollowUpOptions } from "@/lib/follow-up-options";
import { FollowUpForm } from "../components/follow-up-form";
import { ClockIcon } from "@/app/components/icons";

export default async function NewFollowUpPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const options = await loadFollowUpOptions(supabase, access.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <ClockIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Add a follow-up</h1>
          <p className="text-sm text-muted">Record an owner, due date and the record it belongs to.</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <FollowUpForm mode="create" {...options} />
      </div>
    </div>
  );
}
