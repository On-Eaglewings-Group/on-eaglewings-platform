import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { UsersIcon } from "@/app/components/icons";
import { InviteForm } from "./invite-form";
import { PendingInvitationsList } from "./pending-invitations-list";
import { MembersList } from "./members-list";

export default async function TeamPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status !== "allowed") redirect("/sign-in");

  const isAdminOrOwner = access.role === "owner" || access.role === "admin";

  // Fetch current workspace members
  const { data: rawMembers } = await supabase
    .from("workspace_memberships")
    .select("user_id, role, status, joined_at, user_profiles(display_name, avatar_path)")
    .eq("workspace_id", access.workspaceId!)
    .order("joined_at", { ascending: true });

  // Supabase returns user_profiles as an array for joins; normalise to object | null.
  const members = (rawMembers ?? []).map((m) => ({
    ...m,
    user_profiles: Array.isArray(m.user_profiles)
      ? (m.user_profiles[0] ?? null)
      : m.user_profiles,
  }));

  // Fetch pending invitations (only visible to owner/admin — RLS enforces this)
  const { data: invitations } = isAdminOrOwner
    ? await supabase
        .from("pending_invitations")
        .select("id, invited_email, role, invited_at, expires_at")
        .eq("workspace_id", access.workspaceId!)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("invited_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <UsersIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Team</h1>
          <p className="text-sm text-muted">
            Manage workspace members and pending invitations.
          </p>
        </div>
      </div>

      {/* Invite form — owners and admins only */}
      {isAdminOrOwner && (
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-charcoal">Invite a team member</h2>
          <Suspense>
            <InviteForm />
          </Suspense>
        </section>
      )}

      {/* Pending invitations */}
      {isAdminOrOwner && invitations && invitations.length > 0 && (
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-charcoal">Pending invitations</h2>
          <PendingInvitationsList invitations={invitations} />
        </section>
      )}

      {/* Active members */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-charcoal">Workspace members</h2>
        <MembersList members={members} currentUserId={access.userId!} />
      </section>
    </div>
  );
}
