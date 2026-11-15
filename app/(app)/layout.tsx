import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/lib/auth/workspace-context";

function CheckingAccess() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-workspace px-4">
      <p role="status" className="text-sm font-medium text-muted">Checking your workspace access…</p>
    </main>
  );
}

async function AccessCheckedApp({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  return (
    <AppShell
      role={(access.role ?? null) as WorkspaceRole | null}
      userId={access.userId ?? null}
      workspaceId={access.workspaceId ?? null}
    >
      {children}
    </AppShell>
  );
}

export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<CheckingAccess />}>
      <AccessCheckedApp>{children}</AccessCheckedApp>
    </Suspense>
  );
}
