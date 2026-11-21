import type { SupabaseClient } from "@supabase/supabase-js";
import { profileDisplayName } from "@/lib/relations";

export async function loadFollowUpOptions(supabase: SupabaseClient, workspaceId: string) {
  const [members, contacts, meetings, opportunities, requirements] = await Promise.all([
    supabase
      .from("workspace_memberships")
      .select("user_id, user_profiles(display_name)")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("contacts")
      .select("id, full_name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("full_name"),
    supabase
      .from("meetings")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("mineral_opportunities")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("buyer_requirements")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("title"),
  ]);

  return {
    members: (members.data ?? []).map((member) => ({
      user_id: member.user_id as string,
      label: profileDisplayName(member.user_profiles, "Workspace member"),
    })),
    contacts: (contacts.data ?? []).map((row) => ({ id: row.id as string, label: row.full_name as string })),
    meetings: (meetings.data ?? []).map((row) => ({ id: row.id as string, label: row.title as string })),
    opportunities: (opportunities.data ?? []).map((row) => ({ id: row.id as string, label: row.title as string })),
    requirements: (requirements.data ?? []).map((row) => ({ id: row.id as string, label: row.title as string })),
  };
}