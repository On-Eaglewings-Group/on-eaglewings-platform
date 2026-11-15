import Link from "next/link";
import { FileIcon, UsersIcon } from "@/app/components/icons";

export default function ContactsPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <UsersIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Contacts</h1>
          <p className="text-sm text-muted">Manage contacts across the sourcing network.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileIcon className="h-4 w-4" />
          <p className="text-sm">No contacts recorded yet.</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          Contacts will track individuals involved in sourcing, purchasing, and commercial decisions.
        </p>
        <Link
          href="/contacts/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
        >
          <UsersIcon className="h-4 w-4" />
          Add a Contact
        </Link>
      </div>
    </div>
  );
}
