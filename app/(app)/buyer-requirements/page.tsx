import Link from "next/link";
import { FileIcon, ClipboardIcon } from "@/app/components/icons";

export default function BuyerRequirementsPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <ClipboardIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Buyer Requirements</h1>
          <p className="text-sm text-muted">Manage buyer requirements and commercial needs.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileIcon className="h-4 w-4" />
          <p className="text-sm">No buyer requirements recorded yet.</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          Buyer requirements will capture spec needs, volumes, timing, and commercial preferences.
        </p>
        <Link
          href="/buyer-requirements/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
        >
          <ClipboardIcon className="h-4 w-4" />
          Add a Buyer Requirement
        </Link>
      </div>
    </div>
  );
}
