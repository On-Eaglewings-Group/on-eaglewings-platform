/**
 * Resolve access using a server-verified Auth user and rows returned by the
 * caller's RLS-scoped workspace_memberships query.
 *
 * @param {{ getUser: () => Promise<{ data?: { user?: { id?: string } | null }, error?: unknown }> }} auth
 * @param {(userId: string) => Promise<{ data?: Array<{ user_id?: string, workspace_id?: string, status?: string, role?: string }> | null, error?: unknown }>} getMemberships
 */
export async function resolveWorkspaceAccess(auth, getMemberships) {
  let authResult;
  try {
    authResult = await auth.getUser();
  } catch {
    return { status: "unauthenticated" };
  }

  const user = authResult?.data?.user;
  if (authResult?.error || !user?.id) {
    return { status: "unauthenticated" };
  }

  let membershipResult;
  try {
    membershipResult = await getMemberships(user.id);
  } catch {
    return { status: "denied" };
  }

  if (membershipResult?.error || !Array.isArray(membershipResult?.data)) {
    return { status: "denied" };
  }

  const membership = membershipResult.data.find(
    (row) =>
      row?.user_id === user.id &&
      row.status === "active" &&
      typeof row.workspace_id === "string" &&
      row.workspace_id.length > 0,
  );

  if (!membership) {
    return { status: "denied" };
  }

  return {
    status: "allowed",
    userId: user.id,
    workspaceId: membership.workspace_id,
    role: membership.role,
  };
}
