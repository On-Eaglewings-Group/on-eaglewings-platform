import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { MineIcon, ArrowLeftIcon } from "@/app/components/icons";
import { MineForm } from "../components/mine-form";

export default async function MinesNewPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  // Fetch registered organizations to allow initial relationship linking
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, legal_name, trading_name")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("legal_name", { ascending: true });

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back button and title */}
      <div>
        <Link
          href="/mines"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Mines
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <MineIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Register a Mine</h1>
            <p className="text-sm text-muted">
              Add a mining site to your workspace registry with geographical and operational details.
            </p>
          </div>
        </div>
      </div>

      <MineForm organizations={organizations ?? []} />
    </div>
  );
}
