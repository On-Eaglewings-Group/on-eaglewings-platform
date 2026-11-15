import Link from "next/link";
import { FileIcon, UsersIcon } from "@/app/components/icons";

export default function ProducersNewPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <UsersIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Add a Producer</h1>
          <p className="text-sm text-muted">Register a producing entity in the directory. This will open the producer form.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileIcon className="h-4 w-4" />
          <p className="text-sm">Form not yet built.</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          The producer form will capture entity details, commodity focus, location, production capacity, and commercial status.
        </p>
        <Link
          href="/producers"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
        >
          Back to Producers
        </Link>
      </div>
    </div>
  );
}
