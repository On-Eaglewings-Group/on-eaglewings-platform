"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface SettingsActionResult {
  ok: boolean;
  error?: string;
}

const TIMEZONES = new Set([
  "UTC",
  "Africa/Johannesburg",
  "Africa/Lusaka",
  "Africa/Kinshasa",
  "Africa/Harare",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
]);

export async function updateWorkspaceSettingsAction(
  _prev: SettingsActionResult | null,
  formData: FormData,
): Promise<SettingsActionResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const currency = ((formData.get("default_currency") as string | null) ?? "").trim().toUpperCase();
  const timezone = (formData.get("timezone") as string | null)?.trim() ?? "";

  if (!name) return { ok: false, error: "Workspace name is required." };
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "Default currency must be a 3-letter ISO code." };
  }
  if (!TIMEZONES.has(timezone)) {
    return { ok: false, error: "Select a supported timezone." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (access.role !== "owner" && access.role !== "admin") {
    return { ok: false, error: "Only owners and administrators can change workspace settings." };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      default_currency: currency,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", access.workspaceId);

  if (error) return { ok: false, error: `Failed to save settings: ${error.message}` };

  revalidatePath("/settings");
  revalidatePath("/settings/general");
  return { ok: true };
}
