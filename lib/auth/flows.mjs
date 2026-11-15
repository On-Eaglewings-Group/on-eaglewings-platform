/**
 * Supabase Authentication flow helpers for On-Eaglewings.
 */

/**
 * Sign out the current browser session locally.
 * Supabase clears this browser's local session before its best-effort
 * refresh-token revocation request for the local scope.
 *
 * @param {{ signOut: (options: { scope: "local" }) => Promise<{ error?: unknown }> }} auth
 */
export async function signOutCurrentBrowser(auth) {
  try {
    await auth.signOut({ scope: "local" });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
