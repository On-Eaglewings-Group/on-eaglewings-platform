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

export interface AllowedWorkspaceAccess {
  status: "allowed";
  userId: string;
  workspaceId: string;
  role: string;
}

export async function requireWorkspaceAccess(client: SupabaseClient): Promise<AllowedWorkspaceAccess> {
  const access = await getWorkspaceAccess(client);
  if (access.status !== "allowed" || !access.workspaceId || !access.userId) {
    throw new Error(
      access.status === "unauthenticated"
        ? "You must be signed in to perform this action."
        : "You do not have active access to this workspace.",
    );
  }
  return access as AllowedWorkspaceAccess;
}

