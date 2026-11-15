import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWorkspaceAccess } from "./access-policy.mjs";

export async function getWorkspaceAccess(client: SupabaseClient) {
  return resolveWorkspaceAccess(client.auth, async (userId) => {
    const { data, error } = await client
      .from("workspace_memberships")
      .select("user_id, workspace_id, status, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    return { data, error };
  });
}
