import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { firstRelation } from "@/lib/relations";
import { ArrowLeftIcon, LinkIcon } from "@/app/components/icons";
import { MatchActions } from "./actions";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const { data: match, error } = await supabase
    .from("matching_results")
    .select(`
      id, score, status, algorithm_version, generated_at, score_explanation,
      mineral_opportunities (id, title, status),
      buyer_requirements (id, title, status)
    `)
    .eq("id", id)
    .eq("workspace_id", access.workspaceId)
    .single();

  if (error || !match) notFound();

  const { data: introduction } = await supabase
    .from("introductions")
    .select("id, status, notes, introduced_at")
    .eq("workspace_id", access.workspaceId)
    .eq("matching_result_id", id)
    .maybeSingle();

  const opportunity = firstRelation(
    match.mineral_opportunities as { id: string; title: string; status: string } | { id: string; title: string; status: string }[] | null,
  );
  const requirement = firstRelation(
    match.buyer_requirements as { id: string; title: string; status: string } | { id: string; title: string; status: string }[] | null,
  );
  const explanation = match.score_explanation as { note?: string; basis?: string } | null;
  const canReview = ["owner", "admin", "manager"].includes(access.role ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <LinkIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Match</h1>
          <p className="text-sm text-muted">Saved as a suggestion until a manager reviews it.</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm text-charcoal">
          <span className="font-semibold">{opportunity?.title ?? "Opportunity"}</span>
          {" → "}
          <span className="font-semibold">{requirement?.title ?? "Requirement"}</span>
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Status</dt>
            <dd className="capitalize text-charcoal">{match.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Confidence</dt>
            <dd className="text-charcoal">{Math.round(Number(match.score) * 100)}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Recorded as</dt>
            <dd className="text-charcoal">{match.algorithm_version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Introduction</dt>
            <dd className="capitalize text-charcoal">{introduction?.status ?? "None"}</dd>
          </div>
        </dl>
        {explanation?.note && <p className="text-sm text-charcoal">{explanation.note}</p>}
        <MatchActions
          matchId={match.id}
          status={match.status}
          canReview={canReview}
          hasIntroduction={Boolean(introduction)}
        />
      </div>

      <Link href="/matching" className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal">
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Back to matches
      </Link>
    </div>
  );
}