import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { MatchForm } from "../components/match-form";
import { LinkIcon } from "@/app/components/icons";

export default async function NewMatchPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const [{ data: opportunities }, { data: requirements }] = await Promise.all([
    supabase.from("mineral_opportunities").select("id, title").eq("workspace_id", access.workspaceId).is("archived_at", null).order("title"),
    supabase.from("buyer_requirements").select("id, title").eq("workspace_id", access.workspaceId).is("archived_at", null).order("title"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <LinkIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Record a match</h1>
          <p className="text-sm text-muted">Saves a suggested match. Score and links cannot be edited afterwards; review it instead.</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <MatchForm opportunities={opportunities ?? []} requirements={requirements ?? []} />
      </div>
    </div>
  );
}
