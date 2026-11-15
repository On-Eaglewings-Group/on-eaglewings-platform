import Link from "next/link";
import { GemIcon } from "@/app/components/icons";
import { SignOutButton } from "@/app/components/sign-out-button";

export default function AccessDeniedPage() {
  return (
    <section className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-xl sm:p-8">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold">
        <GemIcon className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-charcoal">Workspace access required</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Your account does not have access to an active workspace. Contact the platform administrator to request or renew your invitation.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href="/sign-in"
          className="text-sm font-semibold text-navy-800 underline-offset-4 hover:underline"
        >
          Go to sign in
        </Link>
        <SignOutButton />
      </div>
    </section>
  );
}
