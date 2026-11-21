import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { firstRelation } from "@/lib/relations";
import { LinkIcon, PlusIcon } from "@/app/components/icons";

export default async function MatchingPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const { data, error } = await supabase
    .from("matching_results")
    .select(`
      id, score, status, algorithm_version, generated_at,
      mineral_opportunities (id, title),
      buyer_requirements (id, title)
    `)
    .eq("workspace_id", access.workspaceId)
    .order("generated_at", { ascending: false });

  const canCreate = ["owner", "admin", "manager", "contributor"].includes(access.role ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <LinkIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Matching & Introductions</h1>
            <p className="text-sm text-muted">Suggested links between opportunities and buyer requirements. A manager reviews each one before an introduction.</p>
          </div>
        </div>
        {canCreate && (
          <Link href="/matching/new" className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
            <PlusIcon className="h-4 w-4" />
            Record a match
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Matches could not be loaded: {error.message}
        </p>
      )}

      {!error && (data ?? []).length === 0 && (
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <p className="text-sm text-charcoal">No matches have been recorded in this workspace.</p>
          {canCreate && (
            <Link href="/matching/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
              Record a match
            </Link>
          )}
        </div>
      )}

      <div className="space-y-3">
        {(data ?? []).map((match) => {
          const opportunity = firstRelation(match.mineral_opportunities as { title: string } | { title: string }[] | null);
          const requirement = firstRelation(match.buyer_requirements as { title: string } | { title: string }[] | null);
          return (
            <Link key={match.id} href={`/matching/${match.id}`} className="block rounded-xl border border-border bg-white p-4 shadow-sm hover:border-navy-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{opportunity?.title ?? "Opportunity"} → {requirement?.title ?? "Requirement"}</p>
                  <p className="mt-1 text-xs text-muted">
                    Confidence {Math.round(Number(match.score) * 100)}% · {match.algorithm_version}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted">{match.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
