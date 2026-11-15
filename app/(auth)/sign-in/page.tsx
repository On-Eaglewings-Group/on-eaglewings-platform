import { Suspense } from "react";
import { GemIcon } from "@/app/components/icons";
import { SignInForm } from "@/app/components/sign-in-form";

function getErrorMessage(error?: string | string[]): string | undefined {
  if (!error) return undefined;
  const code = Array.isArray(error) ? error[0] : error;
  switch (code) {
    case "auth_callback_failed":
      return "Authentication could not be completed with Google. Please try again.";
    case "access_denied":
      return "Your account does not have access to an active workspace.";
    default:
      return "An error occurred while signing in. Please try again.";
  }
}

async function SignInContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialError = getErrorMessage(params?.error);

  return (
    <section className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold">
          <GemIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-charcoal">On-Eaglewings</p>
          <p className="text-xs text-muted">Opportunity Hub</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-charcoal">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Sign in with your personal Google account or Google Workspace account.
      </p>

      <div className="mt-6">
        <SignInForm initialError={initialError} />
      </div>

      <div className="mt-6 rounded-lg bg-workspace p-3 text-center">
        <p className="text-xs text-muted">
          Only authorized On-Eaglewings workspace members can access platform data. Public registration is not available.
        </p>
      </div>
    </section>
  );
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={null}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}
