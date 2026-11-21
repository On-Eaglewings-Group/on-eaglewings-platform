"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export interface MatchActionResult {
  ok: boolean;
  error?: string;
  matchId?: string;
}

const ALGORITHM_VERSION = "manual-v1";

function canMutate(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "contributor";
}

function canReview(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export async function createMatchAction(
  _prev: MatchActionResult | null,
  formData: FormData,
): Promise<MatchActionResult> {
  const opportunityId = (formData.get("mineral_opportunity_id") as string | null)?.trim() ?? "";
  const requirementId = (formData.get("buyer_requirement_id") as string | null)?.trim() ?? "";
  const note = (formData.get("note") as string | null)?.trim() ?? "";
  const confidenceRaw = (formData.get("confidence") as string | null)?.trim() ?? "100";

  if (!opportunityId || !requirementId) {
    return { ok: false, error: "Select both an opportunity and a buyer requirement." };
  }

  const confidence = Number(confidenceRaw);
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
    return { ok: false, error: "Confidence must be a whole number from 0 to 100." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to record matches." };
  }

  const matchId = crypto.randomUUID();
  const { error } = await supabase.from("matching_results").insert({
    id: matchId,
    workspace_id: access.workspaceId,
    mineral_opportunity_id: opportunityId,
    buyer_requirement_id: requirementId,
    score: confidence / 100,
    score_explanation: {
      basis: "manual",
      note: note || "Recorded by a workspace member.",
      confidence,
    },
    algorithm_version: ALGORITHM_VERSION,
    status: "suggested",
  });

  if (error) {
    return { ok: false, error: `Failed to record match: ${error.message}` };
  }

  revalidatePath("/matching");
  redirect(`/matching/${matchId}`);
}

async function reviewMatch(matchId: string, status: "reviewed" | "dismissed"): Promise<MatchActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canReview(access.role)) {
    return { ok: false, error: "Only owners, admins and managers can review matches." };
  }

  const { error } = await supabase
    .from("matching_results")
    .update({ status })
    .eq("id", matchId)
    .eq("workspace_id", access.workspaceId)
    .eq("status", "suggested");

  if (error) {
    return { ok: false, error: `Failed to review match: ${error.message}` };
  }

  revalidatePath(`/matching/${matchId}`);
  revalidatePath("/matching");
  return { ok: true, matchId };
}

export async function acceptMatchAction(matchId: string): Promise<MatchActionResult> {
  return reviewMatch(matchId, "reviewed");
}

export async function dismissMatchAction(matchId: string): Promise<MatchActionResult> {
  return reviewMatch(matchId, "dismissed");
}

export async function createIntroductionAction(matchId: string): Promise<MatchActionResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access denied." };
  }
  if (!canMutate(access.role)) {
    return { ok: false, error: "You do not have permission to create introductions." };
  }

  const { error } = await supabase.from("introductions").insert({
    workspace_id: access.workspaceId,
    matching_result_id: matchId,
    status: "draft",
    initiated_by: access.userId,
  });

  if (error) {
    return { ok: false, error: `Failed to create introduction: ${error.message}` };
  }

  revalidatePath(`/matching/${matchId}`);
  revalidatePath("/matching");
  return { ok: true, matchId };
}
