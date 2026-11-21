import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { profileDisplayName } from "@/lib/relations";
import { ClockIcon, PlusIcon } from "@/app/components/icons";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = (params.status ?? "").trim();
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  let query = supabase
    .from("follow_ups")
    .select("id, title, status, priority, due_at, assigned_to, created_at")
    .eq("workspace_id", access.workspaceId)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);

  const [{ data: followUps, error }, { data: members }] = await Promise.all([
    query,
    supabase
      .from("workspace_memberships")
      .select("user_id, user_profiles(display_name)")
      .eq("workspace_id", access.workspaceId)
      .eq("status", "active"),
  ]);

  const names = new Map(
    (members ?? []).map((member) => [member.user_id as string, profileDisplayName(member.user_profiles)]),
  );
  const canCreate = ["owner", "admin", "manager", "contributor"].includes(access.role ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Follow-ups</h1>
            <p className="text-sm text-muted">Open work linked to contacts, meetings, opportunities and requirements.</p>
          </div>
        </div>
        {canCreate && (
          <Link href="/follow-ups/new" className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
            <PlusIcon className="h-4 w-4" />
            Add a follow-up
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        {["all", "open", "in_progress", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            name="status"
            value={status}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${(statusFilter || "all") === status ? "border-navy-900 bg-navy-900 text-white" : "border-border bg-white text-charcoal"}`}
          >
            {status === "all" ? "All" : status.replace("_", " ")}
          </button>
        ))}
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Follow-ups could not be loaded: {error.message}
        </p>
      )}

      {!error && (followUps ?? []).length === 0 && (
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <p className="text-sm text-charcoal">No follow-ups match this view.</p>
          {canCreate && (
            <Link href="/follow-ups/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
              Add a follow-up
            </Link>
          )}
        </div>
      )}

      <div className="space-y-3">
        {(followUps ?? []).map((item) => (
          <Link key={item.id} href={`/follow-ups/${item.id}`} className="block rounded-xl border border-border bg-white p-4 shadow-sm hover:border-navy-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.due_at ? `Due ${String(item.due_at).slice(0, 10)}` : "No due date"}
                  {" · "}
                  {item.assigned_to ? names.get(item.assigned_to) ?? "Assigned" : "Unassigned"}
                  {" · "}
                  {item.priority}
                </p>
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted">
                {String(item.status).replace("_", " ")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
