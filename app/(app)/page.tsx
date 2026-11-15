import Link from "next/link";
import { HomeIcon, MineIcon, GemIcon, ClipboardIcon, UsersIcon, ClockIcon, BriefcaseIcon, ArrowRightIcon } from "@/app/components/icons";
import { KpiCard } from "../components/kpi-card";
import { EmptyState } from "../components/empty-state";
import { ActionCard } from "../components/action-card";

export default function OverviewPage() {
  return (
    <div>
      {/* Welcome */}
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Business Development Overview
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Monitor mineral sourcing opportunities, relationships and commercial progress.
        </p>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Mine & Producer Network"
          value="— Unavailable —"
          subtitle="Supplier network registry — no records yet"
          icon={BriefcaseIcon}
        />
        <KpiCard
          label="Active Opportunities"
          value="— Unavailable —"
          subtitle="Qualified mineral opportunities — none yet"
          icon={GemIcon}
        />
        <KpiCard
          label="Buyer Relationships"
          value="— Unavailable —"
          subtitle="Buyer accounts tracked — none yet"
          icon={UsersIcon}
        />
        <KpiCard
          label="Pending Follow-ups"
          value="— Unavailable —"
          subtitle="Action items awaiting review — none yet"
          icon={ClockIcon}
        />
      </div>

      {/* Main workspace */}
      <div className="mt-8 space-y-6">
        {/* Recent Activity */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-charcoal">Recent Activity</h2>
            <Link
              href="/matching"
              className="text-xs font-medium text-navy-700 hover:text-navy-900"
            >
              View all
            </Link>
          </div>
          <EmptyState
            icon={HomeIcon}
            title="No activity recorded"
            description="Activity will appear here once partners, opportunities and follow-ups are added."
            actionLabel="View Matching & Introductions"
            actionHref="/matching"
            actionIcon={ArrowRightIcon}
          />
        </div>

        {/* Opportunities Pipeline */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-charcoal">Opportunities Pipeline</h2>
          </div>
          <div className="flex flex-col gap-3">
            {["Qualified Opportunities", "In Negotiation", "Awaiting Approval", "Committed"].map((stage) => (
              <div
                key={stage}
                className="flex items-center gap-4 rounded-xl border border-border bg-white p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800/80">
                  <GemIcon className="h-5 w-5 text-navy-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal">{stage}</p>
                  <p className="text-xs text-muted">Placeholder stage — no opportunities yet</p>
                </div>
                <span className="text-xs font-medium text-muted">0</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-charcoal">Upcoming Follow-ups</h2>
            <Link
              href="/follow-ups"
              className="text-xs font-medium text-navy-700 hover:text-navy-900"
            >
              Add follow-up
            </Link>
          </div>
          <EmptyState
            icon={ClockIcon}
            title="No follow-ups scheduled"
            description="Schedule a follow-up to keep commercial relationships moving forward."
            actionLabel="Schedule a Follow-up"
            actionHref="/follow-ups/new"
            actionIcon={ArrowRightIcon}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold tracking-tight text-charcoal">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            label="Add a Mine"
            description="Register a new mine in the supplier network"
            icon={MineIcon}
            href="/mines/new"
          />
          <ActionCard
            label="Record an Opportunity"
            description="Log a mineral opportunity for assessment"
            icon={GemIcon}
            href="/opportunities/new"
          />
          <ActionCard
            label="Add a Buyer Requirement"
            description="Capture a buyer requirement and its specifications"
            icon={ClipboardIcon}
            href="/buyer-requirements/new"
          />
          <ActionCard
            label="Schedule a Follow-up"
            description="Set up a commercial follow-up activity"
            icon={ClockIcon}
            href="/follow-ups/new"
          />
        </div>
      </div>
    </div>
  );
}
