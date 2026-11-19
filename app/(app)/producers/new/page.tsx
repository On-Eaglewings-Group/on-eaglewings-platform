import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { BuildingIcon, ArrowLeftIcon } from "@/app/components/icons";
import { ProducerForm } from "../components/producer-form";

export default async function ProducersNewPage() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  // Fetch available mines to allow optional linkage
  const { data: mines } = await supabase
    .from("mines")
    .select("id, name, country_code, region")
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/producers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to Producers
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Register a Producer</h1>
            <p className="text-sm text-muted">
              Add a mineral producer or mining entity to the supplier network.
            </p>
          </div>
        </div>
      </div>

      <ProducerForm mines={mines ?? []} />
    </div>
  );
}
