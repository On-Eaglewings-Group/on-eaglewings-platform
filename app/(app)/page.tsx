import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { HomeIcon, MineIcon, GemIcon, ClipboardIcon, UsersIcon, ClockIcon, BriefcaseIcon, ArrowRightIcon } from "@/app/components/icons";
import { KpiCard } from "../components/kpi-card";
import { EmptyState } from "../components/empty-state";
import { ActionCard } from "../components/action-card";

const PIPELINE = [
  { label: "Qualified Opportunities", status: "qualified" },
  { label: "In Negotiation", status: "in_negotiation" },
  { label: "Awaiting Approval", status: "awaiting_approval" },
  { label: "Committed", status: "committed" },
];

export default async function OverviewPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status !== "allowed" || !access.workspaceId) redirect("/access-denied");

  const workspaceId = access.workspaceId;
  const [organizations, opportunities, requirements, followUps, upcoming] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("mineral_opportunities").select("status").eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("buyer_requirements").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["open", "in_progress"]),
    supabase.from("follow_ups").select("id, title, due_at, status").eq("workspace_id", workspaceId).in("status", ["open", "in_progress"]).order("due_at", { ascending: true, nullsFirst: false }).limit(5),
  ]);

  const opportunityRows = opportunities.data ?? [];
  const activeOpportunities = opportunityRows.filter((row) => !["lost", "closed"].includes(row.status)).length;

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Business Development Overview
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Monitor mineral sourcing opportunities, relationships and commercial progress.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Mine & Producer Network"
          value={organizations.error ? "—" : String(organizations.count ?? 0)}
          subtitle="Organisations in this workspace"
          icon={BriefcaseIcon}
        />
        <KpiCard
          label="Active Opportunities"
          value={opportunities.error ? "—" : String(activeOpportunities)}
          subtitle="Open mineral opportunities"
          icon={GemIcon}
        />
        <KpiCard
          label="Buyer Relationships"
          value={requirements.error ? "—" : String(requirements.count ?? 0)}
          subtitle="Buyer requirements on file"
          icon={UsersIcon}
        />
        <KpiCard
          label="Pending Follow-ups"
          value={followUps.error ? "—" : String(followUps.count ?? 0)}
          subtitle="Open or in progress"
          icon={ClockIcon}
        />
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-charcoal">Recent Activity</h2>
            <Link href="/matching" className="text-xs font-medium text-navy-700 hover:text-navy-900">
              View matches
            </Link>
          </div>
          <EmptyState
            icon={HomeIcon}
            title="Activity stays on each record"
            description="Open opportunities, meetings and follow-ups to see the latest commercial work."
            actionLabel="View opportunities"
            actionHref="/opportunities"
            actionIcon={ArrowRightIcon}
          />
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-charcoal">Opportunities Pipeline</h2>
          </div>
          <div className="flex flex-col gap-3">
            {PIPELINE.map((stage) => {
              const count = opportunityRows.filter((row) => row.status === stage.status).length;
              return (
                <Link key={stage.status} href={`/opportunities?status=${stage.status}`} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 hover:border-navy-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800/80">
                    <GemIcon className="h-5 w-5 text-navy-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal">{stage.label}</p>
                    <p className="text-xs text-muted">{count === 0 ? "None in this stage" : `${count} in this stage`}</p>
                  </div>
                  <span className="text-xs font-medium text-muted">{opportunities.error ? "—" : count}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-charcoal">Upcoming Follow-ups</h2>
            <Link href="/follow-ups/new" className="text-xs font-medium text-navy-700 hover:text-navy-900">
              Add follow-up
            </Link>
          </div>
          {(upcoming.data ?? []).length === 0 ? (
            <EmptyState
              icon={ClockIcon}
              title="No follow-ups scheduled"
              description="Schedule a follow-up to keep commercial relationships moving forward."
              actionLabel="Schedule a Follow-up"
              actionHref="/follow-ups/new"
              actionIcon={ArrowRightIcon}
            />
          ) : (
            <div className="space-y-2">
              {(upcoming.data ?? []).map((item) => (
                <Link key={item.id} href={`/follow-ups/${item.id}`} className="block rounded-xl border border-border bg-white p-4 hover:border-navy-900">
                  <p className="text-sm font-medium text-charcoal">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.status.replace("_", " ")}
                    {item.due_at ? ` · due ${item.due_at.slice(0, 10)}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold tracking-tight text-charcoal">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard label="Add a Mine" description="Register a new mine in the supplier network" icon={MineIcon} href="/mines/new" />
          <ActionCard label="Record an Opportunity" description="Log a mineral opportunity for assessment" icon={GemIcon} href="/opportunities/new" />
          <ActionCard label="Add a Buyer Requirement" description="Capture a buyer requirement and its specifications" icon={ClipboardIcon} href="/buyer-requirements/new" />
          <ActionCard label="Schedule a Follow-up" description="Set up a commercial follow-up activity" icon={ClockIcon} href="/follow-ups/new" />
        </div>
      </div>
    </div>
  );
}
