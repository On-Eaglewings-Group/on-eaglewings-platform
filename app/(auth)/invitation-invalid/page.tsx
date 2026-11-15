import Link from "next/link";
import { GemIcon } from "@/app/components/icons";

export default function InvitationInvalidPage() {
  return (
    <section className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-xl sm:p-8">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold">
        <GemIcon className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-charcoal">Invitation link unavailable</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        This invitation link is invalid or expired. Ask the platform administrator to send a new invitation.
      </p>
      <Link
        href="/sign-in"
        className="mt-6 inline-flex rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Go to sign in
      </Link>
    </section>
  );
}
