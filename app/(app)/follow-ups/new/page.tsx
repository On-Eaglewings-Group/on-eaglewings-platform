import Link from "next/link";
import { FileIcon, ClockIcon } from "@/app/components/icons";

export default function FollowUpsNewPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <ClockIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Add a Follow-up</h1>
          <p className="text-sm text-muted">Schedule a commercial follow-up activity. This will open the follow-up form.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileIcon className="h-4 w-4" />
          <p className="text-sm">Form not yet built.</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          The follow-up form will capture activity details, owner, due date, related opportunity or relationship, and status.
        </p>
        <Link
          href="/follow-ups"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
        >
          Back to Follow-ups
        </Link>
      </div>
    </div>
  );
}
